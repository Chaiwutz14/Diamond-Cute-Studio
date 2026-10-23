/* Diamond Cute Studio 💎 — contact form and CMS contact channels */
'use strict';

const contactForm = document.getElementById('contact-form');
contactForm?.addEventListener('submit', async function (event) {
  event.preventDefault();
  if (!contactForm.reportValidity()) return;

  const name = document.getElementById('cf-name').value.trim();
  const contact = document.getElementById('cf-contact').value.trim();
  const topic = document.getElementById('cf-topic').value;
  const message = document.getElementById('cf-msg').value.trim();
  const result = document.getElementById('cf-result');
  const button = document.getElementById('cf-submit');
  const initialLabel = button.textContent;

  button.disabled = true;
  button.textContent = 'กำลังส่งข้อความ…';
  result.style.display = 'block';
  result.style.color = 'var(--text-2)';
  result.textContent = 'กำลังบันทึกข้อความของคุณ';

  try {
    const db = await DMC.getFirebaseReady();
    await db.collection('contacts').add({
      name,
      contact,
      topic,
      message,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    result.style.color = 'var(--emerald)';
    result.textContent = 'ส่งข้อความเรียบร้อยแล้ว ขอบคุณที่ติดต่อเรา';
    button.textContent = 'ส่งข้อความแล้ว';

    // The contact is saved first; a notification outage must not make the customer resubmit it.
    try {
      DMC.sendLineNotify({
        orderId: 'CONTACT',
        customerName: name,
        customerPhone: contact,
        itemsSummary: '[' + topic + '] ' + message,
        total: 0,
        paymentMethod: 'contact_form',
      }).catch(() => {});
    } catch (error) {}
  } catch (error) {
    result.style.color = 'var(--rose)';
    result.textContent = 'ส่งข้อความไม่สำเร็จ กรุณาลองอีกครั้ง หรือติดต่อผ่านช่องทางที่แสดงไว้';
    button.disabled = false;
    button.textContent = initialLabel;
  }
});

function verifiedHttpsLink(value, hosts, pathIsRequired) {
  if (!value) return '';
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (url.protocol !== 'https:' || !hosts.includes(host)) return '';
    if (pathIsRequired && !url.pathname.split('/').filter(Boolean).length) return '';
    return url.href;
  } catch (error) { return ''; }
}

function showExternalChannel(id, href) {
  const link = document.getElementById(id);
  if (!link) return;
  if (!href) {
    link.removeAttribute('href');
    link.hidden = true;
    return;
  }
  link.href = href;
  link.hidden = false;
}

function applyContactContent(content) {
  const contact = content?.contact || {};
  let lineValue = contact.line;
  try {
    if (typeof CMS !== 'undefined' && CMS.lineChat) lineValue = CMS.lineChat(contact);
  } catch (error) {
    // A malformed optional LINE setting should not hide other contact channels.
  }
  const lineUrl = verifiedHttpsLink(
    lineValue,
    ['line.me', 'lin.ee'],
    true,
  );
  showExternalChannel('ch-line', lineUrl);
  const lineLabel = document.getElementById('ch-line-label');
  if (lineLabel) lineLabel.textContent = contact.lineLabel || 'เปิดแชท LINE';

  showExternalChannel('ch-fb', verifiedHttpsLink(contact.facebook, ['facebook.com', 'fb.com'], true));
  showExternalChannel('ch-ig', verifiedHttpsLink(contact.instagram, ['instagram.com'], true));
  const tiktok = verifiedHttpsLink(contact.tiktok, ['tiktok.com'], true);
  showExternalChannel('ch-tt', tiktok && /^\/@[^/]+(?:\/|$)/i.test(new URL(tiktok).pathname) ? tiktok : '');

  const email = String(contact.email || '').replace(/^mailto:/i, '').trim();
  const mailLink = document.getElementById('ch-mail');
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (mailLink) {
      mailLink.href = 'mailto:' + email;
      mailLink.hidden = false;
    }
    const label = document.getElementById('ch-mail-label');
    if (label) label.textContent = email;
  } else if (mailLink) {
    mailLink.removeAttribute('href');
    mailLink.hidden = true;
  }

  const phone = String(contact.phone || '').trim();
  const digits = phone.replace(/[^\d+]/g, '');
  const phoneLink = document.getElementById('ch-phone');
  if (/^\+?\d{8,15}$/.test(digits)) {
    if (phoneLink) {
      phoneLink.href = 'tel:' + digits;
      phoneLink.hidden = false;
    }
    const label = document.getElementById('ch-phone-label');
    if (label) label.textContent = phone;
  } else if (phoneLink) {
    phoneLink.removeAttribute('href');
    phoneLink.hidden = true;
  }

  const hoursCard = document.getElementById('contact-hours-card');
  const hours = document.getElementById('contact-hours');
  if (hoursCard && hours) {
    hours.textContent = String(contact.hours || '').trim();
    hoursCard.hidden = !hours.textContent;
  }
}

if (typeof CMS !== 'undefined') {
  CMS.get().then(applyContactContent).catch(() => {});
}
