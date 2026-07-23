const params = new URLSearchParams(location.search);
      const token = params.get("token");
      const app = document.getElementById("app");
      const money = (v) =>
        new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(Number(v || 0));
      const esc = (v) =>
        String(v ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
      const STATUS_HE = { draft: "טיוטה", sent: "נשלח", accepted: "אושר", rejected: "נדחה", expired: "פג תוקף", converted: "הומר לחשבונית" };

      async function load() {
        if (!token) {
          app.innerHTML = '<p class="muted">קישור לא תקין.</p>';
          return;
        }
        try {
          const r = await fetch(`/api/v1/public/quotes/${encodeURIComponent(token)}`);
          if (!r.ok) {
            app.innerHTML = '<div class="state-icon">🔍</div><h1>הצעת המחיר לא נמצאה</h1><p class="muted">ייתכן שהקישור שגוי או שפג תוקפו.</p>';
            return;
          }
          const data = await r.json();
          render(data);
        } catch {
          app.innerHTML = '<p class="muted">אירעה שגיאה בטעינת הצעת המחיר. נסו לרענן את הדף.</p>';
        }
      }

      function itemsHtml(items, subtotal) {
        if (!items.length)
          return `<tr><td>שירותי אחזקה וכוח אדם מקצועיים</td><td>${money(subtotal)}</td></tr>`;
        return items
          .map((it) => `<tr><td>${esc(it.description)} <span class="muted">× ${it.quantity}</span></td><td>${money(it.total)}</td></tr>`)
          .join("");
      }

      function render({ quote: q, items, company }) {
        const expired = q.valid_until && q.valid_until < new Date().toISOString().slice(0, 10) && !q.accepted_at && q.status !== "converted";
        app.innerHTML = `
          <div>
            <span class="eyebrow">${esc(company.name || "GREECE")}</span>
            <h1>${esc(q.title || q.number)}</h1>
            <p class="muted">${esc(q.number)} · ${esc(q.company_name || q.contact_name || "")}</p>
          </div>
          <span class="badge ${esc(q.status)}">${STATUS_HE[q.status] || esc(q.status)}</span>
          <table>${itemsHtml(items, q.subtotal)}</table>
          <table class="totals">
            <tr><td class="muted">סכום ביניים</td><td>${money(q.subtotal)}</td></tr>
            <tr><td class="muted">מע"מ (${q.vat_rate}%)</td><td>${money(q.vat_amount)}</td></tr>
            <tr class="grand"><td>סה"כ</td><td>${money(q.total)}</td></tr>
          </table>
          ${q.valid_until ? `<p class="muted">בתוקף עד ${esc(q.valid_until)}</p>` : ""}
          ${q.notes ? `<p class="muted">${esc(q.notes)}</p>` : ""}
          <div id="actionArea"></div>
        `;
        const area = document.getElementById("actionArea");
        if (q.status === "converted") {
          area.innerHTML = '<p class="muted">הצעת המחיר הזו הומרה לחשבונית.</p>';
        } else if (q.accepted_at || q.status === "accepted") {
          area.innerHTML = `<div class="center"><div class="state-icon">✅</div><p>ההצעה אושרה${q.signed_name ? " ע\"י " + esc(q.signed_name) : ""}.</p></div>`;
        } else if (q.status === "rejected") {
          area.innerHTML = '<p class="muted">הצעת המחיר סומנה כלא רלוונטית.</p>';
        } else if (expired) {
          area.innerHTML = '<p class="muted">פג תוקפה של הצעת המחיר. צרו קשר לקבלת הצעה מעודכנת.</p>';
        } else {
          area.innerHTML = `
            <div class="field">
              <label for="signedName">הקלידו את שמכם המלא כדי לאשר</label>
              <input id="signedName" type="text" autocomplete="name" />
            </div>
            <div id="error"></div>
            <div class="actions">
              <button class="btn-reject" id="rejectBtn" type="button">דחה</button>
              <button class="btn-accept" id="acceptBtn" type="button">אשר הצעה</button>
            </div>
          `;
          document.getElementById("acceptBtn").onclick = accept;
          document.getElementById("rejectBtn").onclick = reject;
        }
      }

      async function accept() {
        const name = document.getElementById("signedName").value.trim();
        const errEl = document.getElementById("error");
        if (!name) {
          errEl.textContent = "נא להקליד שם מלא";
          return;
        }
        const acceptBtn = document.getElementById("acceptBtn"),
          rejectBtn = document.getElementById("rejectBtn");
        acceptBtn.disabled = rejectBtn.disabled = true;
        try {
          const r = await fetch(`/api/v1/public/quotes/${encodeURIComponent(token)}/accept`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ signed_name: name }),
          });
          const j = await r.json();
          if (!r.ok) throw new Error(j.error?.message || "שגיאה");
          load();
        } catch (e) {
          errEl.textContent = e.message;
          acceptBtn.disabled = rejectBtn.disabled = false;
        }
      }

      async function reject() {
        const acceptBtn = document.getElementById("acceptBtn"),
          rejectBtn = document.getElementById("rejectBtn");
        acceptBtn.disabled = rejectBtn.disabled = true;
        try {
          const r = await fetch(`/api/v1/public/quotes/${encodeURIComponent(token)}/reject`, { method: "POST" });
          if (!r.ok) throw new Error();
          load();
        } catch {
          document.getElementById("error").textContent = "שגיאה, נסו שוב";
          acceptBtn.disabled = rejectBtn.disabled = false;
        }
      }

      load();
