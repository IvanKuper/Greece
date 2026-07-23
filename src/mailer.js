// @ts-nocheck - not yet type-annotated. Revisit in a future milestone.
const nodemailer=require('nodemailer');
const dns=require('dns');
const target=process.env.CONTACT_EMAIL||'greece.maintenance.servicese.ltd@gmail.com';
const resendApiKey=process.env.RESEND_API_KEY;
const configuredSMTP=()=>Boolean(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS);
const configuredResend=()=>Boolean(resendApiKey&&process.env.EMAIL_FROM);
const smtpPort=Number(process.env.SMTP_PORT||587);
const smtpSecure=String(process.env.SMTP_SECURE||'false')==='true';
function normalizeEmailAddress(value){return String(value||'').trim();}
async function sendResendMail({from,to,replyTo,subject,text,html,attachments}){
  if(!configuredResend())return {sent:false,reason:'RESEND_NOT_CONFIGURED'};
  if(!normalizeEmailAddress(to))return {sent:false,reason:'NO_RECIPIENT'};
  const body={from:normalizeEmailAddress(from),to:normalizeEmailAddress(to),subject:normalizeEmailAddress(subject),text};
  if(html)body.html=html;
  if(replyTo)body.reply_to=normalizeEmailAddress(replyTo);
  if(attachments&&attachments.length)body.attachments=attachments.map(a=>({filename:a.filename,content:Buffer.isBuffer(a.content)?a.content.toString('base64'):a.content}));
  const response=await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  let data;
  try{data=await response.json();}catch(_){data={};}
  if(!response.ok){
    const message=data.error?.message||data.error?.type||`Resend error ${response.status}`;
    const error=new Error(message);
    error.response=data;
    throw error;
  }
  return {sent:true,messageId:data.id||null};
}
async function buildTransport(options={}){
  const host=options.host||process.env.SMTP_HOST;
  let resolvedHost=host;
  if(!options.host && host){
    try{
      const {address}=await dns.promises.lookup(host,{family:4});
      resolvedHost=address;
    }catch(_){/* fall back to the hostname if IPv4 lookup fails */}
  }
  return nodemailer.createTransport({
    host:resolvedHost,
    servername:options.servername||process.env.SMTP_HOST,
    port:options.port||smtpPort,
    secure:options.secure!==undefined?options.secure:smtpSecure,
    auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},
    pool:false,
    requireTLS:options.requireTLS||false,
    connectionTimeout:15000,
    greetingTimeout:15000,
    socketTimeout:30000,
  });
}
async function client(options={}){if(!configuredSMTP())return null;return buildTransport(options)}
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
    code==='ENETUNREACH' ||
    message.includes('connection timeout') ||
    message.includes('timed out') ||
    message.includes('socket hang up') ||
    message.includes('network is unreachable')
  );
}
async function sendMailWithFallback(mailOptions){
  if(configuredResend()){
    try{
      return await sendResendMail(mailOptions);
    }catch(error){
      if(configuredSMTP()){
        try{
          const smtpTransport=await client();
          if(smtpTransport){
            const result=await smtpTransport.sendMail(mailOptions);
            return {sent:true,messageId:result.messageId||null,info:result};
          }
        }catch(smtpError){
          error.smtpError=smtpError;
        }
      }
      return {sent:false,reason:'EMAIL_SEND_FAILED',error:error.message};
    }
  }
  const c=await client();
  if(!c) return {sent:false,reason:'SMTP_NOT_CONFIGURED'};
  try{
    const result=await c.sendMail(mailOptions);
    return {sent:true,messageId:result.messageId||null,info:result};
  }catch(error){
    if(process.env.SMTP_HOST==='smtp.gmail.com' && isGmailTimeoutError(error)){
      const fallbackOptions={port:587,secure:false,requireTLS:true,servername:process.env.SMTP_HOST};
      try{
        const {address}=await dns.promises.lookup(process.env.SMTP_HOST,{family:4});
        fallbackOptions.host=address;
      }catch(_){/* fall back to hostname if IPv4 lookup fails */}
      const fallback=await client(fallbackOptions);
      const result=await fallback.sendMail(mailOptions);
      return {sent:true,messageId:result.messageId||null,info:result};
    }
    return {sent:false,reason:'SMTP_ERROR',error:error.message};
  }
}
const clean=v=>String(v||'').replace(/[\r\n]+/g,' ').slice(0,500);
const html=v=>clean(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
async function sendLead(lead){const subject=`פנייה חדשה מהאתר — ${clean(lead.full_name)}`;const lines=[`שם: ${clean(lead.full_name)}`,`חברה: ${clean(lead.company)}`,`טלפון: ${clean(lead.phone)}`,`אימייל: ${clean(lead.email)}`,`שירות: ${clean(lead.service_type)}`,'',String(lead.message||'').slice(0,3000)];const result=await sendMailWithFallback({from:process.env.EMAIL_FROM||`GREECE Website <${process.env.SMTP_USER}>`,to:target,replyTo:lead.email||undefined,subject,text:lines.join('\n'),html:`<div dir="rtl" style="font-family:Arial,sans-serif;max-width:620px"><h2 style="color:#b86f3c">פנייה חדשה מהאתר</h2><table cellpadding="8" style="border-collapse:collapse;width:100%"><tr><td><b>שם</b></td><td>${html(lead.full_name)}</td></tr><tr><td><b>חברה</b></td><td>${html(lead.company)}</td></tr><tr><td><b>טלפון</b></td><td dir="ltr">${html(lead.phone)}</td></tr><tr><td><b>אימייל</b></td><td>${html(lead.email)}</td></tr><tr><td><b>שירות</b></td><td>${html(lead.service_type)}</td></tr></table><h3>הודעה</h3><p style="white-space:pre-wrap">${html(lead.message)}</p></div>`});if(lead.email){await sendMailWithFallback({from:process.env.EMAIL_FROM||`GREECE <${process.env.SMTP_USER}>`,to:lead.email,subject:'קיבלנו את הפנייה שלך — GREECE',text:`שלום ${clean(lead.full_name)},\n\nקיבלנו את פנייתך ונחזור אליך בהקדם.\n\nצוות GREECE`,html:`<div dir="rtl" style="font-family:Arial,sans-serif"><h2>תודה שפנית אלינו</h2><p>שלום ${html(lead.full_name)},</p><p>קיבלנו את פנייתך ונחזור אליך בהקדם.</p><p>צוות GREECE</p></div>`})}return result}
async function sendRaw({subject,body,replyTo}){const result=await sendMailWithFallback({from:process.env.EMAIL_FROM||`GREECE Website <${process.env.SMTP_USER}>`,to:target,replyTo:replyTo||undefined,subject:clean(subject||'פנייה חדשה מהאתר'),text:String(body||'').slice(0,5000)});return result}
async function sendApplication(application){const body=[`משרה: ${clean(application.job_title)}`,`שם: ${clean(application.full_name)}`,`טלפון: ${clean(application.phone)}`,`אימייל: ${clean(application.email)}`,'',`ניסיון: ${String(application.experience||'').slice(0,3000)}`].join('\n');const result=await sendMailWithFallback({from:process.env.EMAIL_FROM||`GREECE Website <${process.env.SMTP_USER}>`,to:target,replyTo:application.email||undefined,subject:`מועמדות חדשה — ${clean(application.job_title||application.full_name)}`,text:body});if(application.email)await sendMailWithFallback({from:process.env.EMAIL_FROM||`GREECE <${process.env.SMTP_USER}>`,to:application.email,subject:'קיבלנו את המועמדות שלך — GREECE',text:`שלום ${clean(application.full_name)},\n\nקיבלנו את המועמדות שלך למשרת ${clean(application.job_title)}. נבחן אותה וניצור קשר בהקדם.\n\nצוות GREECE`});return result}
async function sendPasswordReset({email,name,resetUrl}){const result=await sendMailWithFallback({from:process.env.EMAIL_FROM||`GREECE <${process.env.SMTP_USER}>`,to:email,subject:'איפוס סיסמה — GREECE Business Platform',text:`שלום ${clean(name)},\n\nלחצו על הקישור הבא כדי לאפס את הסיסמה. הקישור תקף לשעה אחת בלבד:\n${resetUrl}\n\nאם לא ביקשתם איפוס סיסמה, אפשר להתעלם מהודעה זו.`,html:`<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.6"><h2>איפוס סיסמה</h2><p>שלום ${html(name)},</p><p>לחצו על הכפתור כדי לאפס את הסיסמה. הקישור תקף לשעה אחת בלבד.</p><p><a href="${html(resetUrl)}" style="display:inline-block;padding:12px 20px;background:#b86f3c;color:white;text-decoration:none;border-radius:6px">איפוס סיסמה</a></p><p>אם לא ביקשתם איפוס סיסמה, אפשר להתעלם מהודעה זו.</p></div>`});return result}
async function sendSecurityAlert({email,name,ip,userAgent}){if(!email)return {sent:false,reason:'NO_RECIPIENT'};const result=await sendMailWithFallback({from:process.env.EMAIL_FROM||`GREECE <${process.env.SMTP_USER}>`,to:email,subject:'New sign-in to your GREECE account',text:`Hello ${clean(name)},\n\nA new sign-in to your GREECE Business Platform account was just detected.\n\nIP address: ${clean(ip)}\nDevice: ${clean(userAgent)}\n\nIf this was not you, sign in and revoke this session from Security Center, then change your password immediately.`,html:`<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>New sign-in detected</h2><p>Hello ${html(name)},</p><p>A new sign-in to your GREECE Business Platform account was just detected.</p><table cellpadding="6"><tr><td><b>IP address</b></td><td>${html(ip)}</td></tr><tr><td><b>Device</b></td><td>${html(userAgent)}</td></tr></table><p>If this was not you, sign in and revoke this session from Security Center, then change your password immediately.</p></div>`});return result}
async function sendInvite({email,name,inviteUrl}){const result=await sendMailWithFallback({from:process.env.EMAIL_FROM||`GREECE <${process.env.SMTP_USER}>`,to:email,subject:'You have been invited to GREECE Business Platform',text:`Hello ${clean(name)},\n\nYou have been invited to join the GREECE Business Platform. Click the link below to set your password and activate your account. This link is valid for 7 days:\n${inviteUrl}\n\nIf you were not expecting this invitation, you can ignore this email.`,html:`<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>You have been invited</h2><p>Hello ${html(name)},</p><p>You have been invited to join the GREECE Business Platform. Click the button below to set your password and activate your account. This link is valid for 7 days.</p><p><a href="${html(inviteUrl)}" style="display:inline-block;padding:12px 20px;background:#b86f3c;color:white;text-decoration:none;border-radius:6px">Activate account</a></p><p>If you were not expecting this invitation, you can ignore this email.</p></div>`});return result}
async function sendInvoiceEmail({email,customerName,invoiceNumber,total,dueDate,companyName,pdfBuffer}){const result=await sendMailWithFallback({from:process.env.EMAIL_FROM||`${clean(companyName)||'GREECE'} <${process.env.SMTP_USER}>`,to:email,subject:`Invoice ${clean(invoiceNumber)} from ${clean(companyName)||'GREECE'}`,text:`Hello ${clean(customerName)},\n\nPlease find attached invoice ${clean(invoiceNumber)} for ${Number(total).toFixed(2)} ILS, due ${clean(dueDate)||'on receipt'}.\n\nThank you for your business.\n\n${clean(companyName)||'GREECE'}`,html:`<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Invoice ${html(invoiceNumber)}</h2><p>Hello ${html(customerName)},</p><p>Please find attached invoice <b>${html(invoiceNumber)}</b> for <b>${Number(total).toFixed(2)} ILS</b>, due ${html(dueDate)||'on receipt'}.</p><p>Thank you for your business.</p><p>${html(companyName)||'GREECE'}</p></div>`,attachments:pdfBuffer?[{filename:`${invoiceNumber}.pdf`,content:pdfBuffer}]:undefined});return result}
async function sendOverdueReminder({email,customerName,invoiceNumber,total,dueDate,companyName}){if(!email)return {sent:false,reason:'NO_RECIPIENT'};const result=await sendMailWithFallback({from:process.env.EMAIL_FROM||`${clean(companyName)||'GREECE'} <${process.env.SMTP_USER}>`,to:email,subject:`Payment reminder: invoice ${clean(invoiceNumber)} is overdue`,text:`Hello ${clean(customerName)},\n\nThis is a reminder that invoice ${clean(invoiceNumber)} for ${Number(total).toFixed(2)} ILS was due on ${clean(dueDate)} and remains unpaid.\n\nPlease arrange payment at your earliest convenience, or contact us if you have already paid.\n\n${clean(companyName)||'GREECE'}`,html:`<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Payment reminder</h2><p>Hello ${html(customerName)},</p><p>This is a reminder that invoice <b>${html(invoiceNumber)}</b> for <b>${Number(total).toFixed(2)} ILS</b> was due on ${html(dueDate)} and remains unpaid.</p><p>Please arrange payment at your earliest convenience, or contact us if you have already paid.</p><p>${html(companyName)||'GREECE'}</p></div>`});return result}
async function verify(){const c=await client();if(!c)return {configured:false,recipient:target};try{await c.verify();return {configured:true,connected:true,recipient:target}}catch(error){return {configured:true,connected:false,recipient:target,error:error.message}}}
const configured=()=>configuredResend()||configuredSMTP();
module.exports={sendLead,sendRaw,sendApplication,sendPasswordReset,sendSecurityAlert,sendInvite,sendInvoiceEmail,sendOverdueReminder,verify,configured,target};
