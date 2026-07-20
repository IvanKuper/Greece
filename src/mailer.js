const nodemailer=require('nodemailer');
const target=process.env.CONTACT_EMAIL||'greece.maintenance.servicese.ltd@gmail.com';
const configured=()=>Boolean(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS);
let transport;
const smtpPort=Number(process.env.SMTP_PORT||587);
const smtpSecure=String(process.env.SMTP_SECURE||'false')==='true';
function buildTransport(options={}){
  return nodemailer.createTransport({
    host:process.env.SMTP_HOST,
    port:options.port||smtpPort,
    secure:options.secure!==undefined?options.secure:smtpSecure,
    auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},
    pool:true,
    maxConnections:3,
    requireTLS:options.requireTLS||false,
    connectionTimeout:10000,
    greetingTimeout:10000,
    socketTimeout:30000,
  });
}
function resetTransport(){transport=null;}
function client(){if(transport)return transport;if(!configured())return null;transport=buildTransport();return transport}
function isGmailTimeoutError(error){
  if(!error) return false;
  const code=String(error.code||'').toUpperCase();
  const message=String(error.message||'').toLowerCase();
  return (
    code==='ETIMEDOUT' ||
    code==='ESOFTTIMEDOUT' ||
    code==='ESOCKETTIMEDOUT' ||
    code==='ECONNREFUSED' ||
    code==='ECONNRESET' ||
    message.includes('connection timeout') ||
    message.includes('timed out') ||
    message.includes('socket hang up')
  );
}
async function sendMailWithFallback(mailOptions){
  const c=client();
  if(!c) return {sent:false,reason:'SMTP_NOT_CONFIGURED'};
  try{
    return await c.sendMail(mailOptions);
  }catch(error){
    resetTransport();
    if(process.env.SMTP_HOST==='smtp.gmail.com' && smtpSecure && smtpPort===465 && isGmailTimeoutError(error)){
      const fallback=buildTransport({port:587,secure:false,requireTLS:true});
      transport=fallback;
      return await transport.sendMail(mailOptions);
    }
    throw error;
  }
}
const clean=v=>String(v||'').replace(/[\r\n]+/g,' ').slice(0,500);
const html=v=>clean(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
async function sendLead(lead){const c=client();if(!c)return {sent:false,reason:'SMTP_NOT_CONFIGURED'};const subject=`פנייה חדשה מהאתר — ${clean(lead.full_name)}`;const lines=[`שם: ${clean(lead.full_name)}`,`חברה: ${clean(lead.company)}`,`טלפון: ${clean(lead.phone)}`,`אימייל: ${clean(lead.email)}`,`שירות: ${clean(lead.service_type)}`,'',String(lead.message||'').slice(0,3000)];const result=await sendMailWithFallback({from:process.env.EMAIL_FROM||`GREECE Website <${process.env.SMTP_USER}>`,to:target,replyTo:lead.email||undefined,subject,text:lines.join('\n'),html:`<div dir="rtl" style="font-family:Arial,sans-serif;max-width:620px"><h2 style="color:#b86f3c">פנייה חדשה מהאתר</h2><table cellpadding="8" style="border-collapse:collapse;width:100%"><tr><td><b>שם</b></td><td>${html(lead.full_name)}</td></tr><tr><td><b>חברה</b></td><td>${html(lead.company)}</td></tr><tr><td><b>טלפון</b></td><td dir="ltr">${html(lead.phone)}</td></tr><tr><td><b>אימייל</b></td><td>${html(lead.email)}</td></tr><tr><td><b>שירות</b></td><td>${html(lead.service_type)}</td></tr></table><h3>הודעה</h3><p style="white-space:pre-wrap">${html(lead.message)}</p></div>`});if(lead.email){await sendMailWithFallback({from:process.env.EMAIL_FROM||`GREECE <${process.env.SMTP_USER}>`,to:lead.email,subject:'קיבלנו את הפנייה שלך — GREECE',text:`שלום ${clean(lead.full_name)},\n\nקיבלנו את פנייתך ונחזור אליך בהקדם.\n\nצוות GREECE`,html:`<div dir="rtl" style="font-family:Arial,sans-serif"><h2>תודה שפנית אלינו</h2><p>שלום ${html(lead.full_name)},</p><p>קיבלנו את פנייתך ונחזור אליך בהקדם.</p><p>צוות GREECE</p></div>`})}return {sent:true,messageId:result.messageId}}
async function sendRaw({subject,body,replyTo}){const c=client();if(!c)return {sent:false,reason:'SMTP_NOT_CONFIGURED'};const result=await sendMailWithFallback({from:process.env.EMAIL_FROM||`GREECE Website <${process.env.SMTP_USER}>`,to:target,replyTo:replyTo||undefined,subject:clean(subject||'פנייה חדשה מהאתר'),text:String(body||'').slice(0,5000)});return {sent:true,messageId:result.messageId}}
async function sendApplication(application){const c=client();if(!c)return {sent:false,reason:'SMTP_NOT_CONFIGURED'};const body=[`משרה: ${clean(application.job_title)}`,`שם: ${clean(application.full_name)}`,`טלפון: ${clean(application.phone)}`,`אימייל: ${clean(application.email)}`,'',`ניסיון: ${String(application.experience||'').slice(0,3000)}`].join('\n');const result=await sendMailWithFallback({from:process.env.EMAIL_FROM||`GREECE Website <${process.env.SMTP_USER}>`,to:target,replyTo:application.email||undefined,subject:`מועמדות חדשה — ${clean(application.job_title||application.full_name)}`,text:body});if(application.email)await sendMailWithFallback({from:process.env.EMAIL_FROM||`GREECE <${process.env.SMTP_USER}>`,to:application.email,subject:'קיבלנו את המועמדות שלך — GREECE',text:`שלום ${clean(application.full_name)},\n\nקיבלנו את המועמדות שלך למשרת ${clean(application.job_title)}. נבחן אותה וניצור קשר בהקדם.\n\nצוות GREECE`});return {sent:true,messageId:result.messageId}}
async function sendPasswordReset({email,name,resetUrl}){const c=client();if(!c)return {sent:false,reason:'SMTP_NOT_CONFIGURED'};const result=await sendMailWithFallback({from:process.env.EMAIL_FROM||`GREECE <${process.env.SMTP_USER}>`,to:email,subject:'איפוס סיסמה — GREECE Business Platform',text:`שלום ${clean(name)},\n\nלחצו על הקישור הבא כדי לאפס את הסיסמה. הקישור תקף לשעה אחת בלבד:\n${resetUrl}\n\nאם לא ביקשתם איפוס סיסמה, אפשר להתעלם מהודעה זו.`,html:`<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.6"><h2>איפוס סיסמה</h2><p>שלום ${html(name)},</p><p>לחצו על הכפתור כדי לאפס את הסיסמה. הקישור תקף לשעה אחת בלבד.</p><p><a href="${html(resetUrl)}" style="display:inline-block;padding:12px 20px;background:#b86f3c;color:white;text-decoration:none;border-radius:6px">איפוס סיסמה</a></p><p>אם לא ביקשתם איפוס סיסמה, אפשר להתעלם מהודעה זו.</p></div>`});return {sent:true,messageId:result.messageId}}
async function verify(){const c=client();if(!c)return {configured:false,recipient:target};try{await c.verify();return {configured:true,connected:true,recipient:target}}catch(error){return {configured:true,connected:false,recipient:target,error:error.message}}}
module.exports={sendLead,sendRaw,sendApplication,sendPasswordReset,verify,configured,target};
