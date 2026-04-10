const PDFDocument = require('pdfkit');

function generateDeliveryLabel(order, res) {
  // Use a smaller standard label size or A4. Let's use A4 as requested by the layout, but maybe half page.
  // We'll stick to standard A4 (595.28 x 841.89) but print large.
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  const fontBold = 'Helvetica-Bold';
  const fontNormal = 'Helvetica';

  // Format Helper
  const formatDate = (ds) => {
    if (!ds) return 'N/A';
    const d = new Date(ds);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate().toString().padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
  };

  const invoiceNo = `INV-${new Date(order.createdAt).getFullYear()}-${order._id.toString().slice(-6).toUpperCase()}`;
  const orderId = `ORD-${order._id.toString().slice(-8).toUpperCase()}`;

  // HEADER
  doc
    .font(fontBold).fontSize(16)
    .text('KALYANI FASHION HUB', { align: 'center' })
    .font(fontNormal).fontSize(10)
    .text('2nd Floor, Main Road, Andhra Pradesh', { align: 'center' })
    .text('Phone: +91 9652300993', { align: 'center' })
    .moveDown(1);

  function drawDashedLine(y) {
    doc.lineWidth(1).dash(3, { space: 3 }).moveTo(40, y).lineTo(555, y).stroke().undash();
  }

  drawDashedLine(doc.y);
  doc.moveDown(0.5);

  // LABEL TITLE
  doc.font(fontBold).fontSize(16).text('DELIVERY LABEL', 40, doc.y, { align: 'center', width: 515 }).moveDown(1);

  // META
  doc.font(fontNormal).fontSize(12);
  doc.text(`Order ID: ${orderId}`, 40, doc.y, { align: 'left' });
  doc.text(`Invoice No: ${invoiceNo}`, 40, doc.y, { align: 'left' });
  doc.text(`Order Date: ${formatDate(order.createdAt)}`, 40, doc.y, { align: 'left' });
  
  doc.moveDown(0.5);
  drawDashedLine(doc.y);
  doc.moveDown(0.5);

  // SHIP FROM / SHIP TO ROW
  const splitY = doc.y;
  
  // SHIP FROM
  doc.font(fontBold).fontSize(12).text('SHIP FROM:', 40, splitY);
  doc.font(fontNormal).fontSize(11)
    .text('Kalyani Fashion Hub', 40, doc.y + 5)
    .text('2nd Floor, Main Road', 40, doc.y)
    .text('Andhra Pradesh - 522001', 40, doc.y)
    .text('Phone: +91 9652300993', 40, doc.y);

  // SHIP TO (split right side)
  doc.font(fontBold).fontSize(12).text('SHIP TO:', 300, splitY);
  
  const customerPhones = [order.address?.mobile1, order.address?.mobile2].filter(Boolean).join(', ');
  
  doc.font(fontNormal).fontSize(11)
    .text(`Customer Name: ${order.userName || 'N/A'}`, 300, splitY + 17)
    .text(`Phone: ${customerPhones || order.phone || 'N/A'}`, 300, doc.y)
    .moveDown(0.5)
    .text('Delivery Address:', 300, doc.y);
    
  if (order.address) {
    if (order.address.street) doc.text(order.address.street, 300, doc.y);
    const cityStatePin = [order.address.city, order.address.state, order.address.pincode].filter(Boolean).join(', ');
    if (cityStatePin) doc.text(cityStatePin, 300, doc.y);
  } else {
    doc.text('N/A', 300, doc.y);
  }

  // Ensure we move past whichever column was longer
  doc.y = Math.max(doc.y, splitY + 100);
  
  doc.moveDown(0.5);
  drawDashedLine(doc.y);
  doc.moveDown(0.5);

  // PRODUCT DETAILS
  doc.font(fontBold).fontSize(12).text('PRODUCT DETAILS:', 40, doc.y).moveDown(0.5);
  doc.font(fontNormal).fontSize(11);
  
  order.items.forEach(item => {
    doc.text(`Product: ${item.name}`, 40, doc.y);
    doc.text(`Size: ${item.size || '-'}`, 40, doc.y);
    doc.text(`Color: ${item.color || '-'}`, 40, doc.y);
    doc.text(`Quantity: ${item.quantity}`, 40, doc.y);
    doc.moveDown(0.5);
  });

  drawDashedLine(doc.y);
  doc.moveDown(0.5);

  // PAYMENT DETAILS
  doc.font(fontBold).fontSize(12).text('PAYMENT DETAILS:', 40, doc.y).moveDown(0.5);
  doc.font(fontNormal).fontSize(11);
  doc.text('Payment Mode: UPI', 40, doc.y);
  doc.text(`Transaction ID: ${order.transactionId || 'N/A'}`, 40, doc.y);
  
  doc.moveDown(0.5);
  drawDashedLine(doc.y);
  doc.moveDown(0.5);

  // DELIVERY DETAILS
  doc.font(fontBold).fontSize(12).text('DELIVERY DETAILS:', 40, doc.y).moveDown(0.5);
  doc.font(fontNormal).fontSize(11);
  doc.text('Expected Delivery: Within 7 Days', 40, doc.y);
  const capStatus = order.status.charAt(0).toUpperCase() + order.status.slice(1);
  doc.text(`Status: ${capStatus}`, 40, doc.y);

  doc.moveDown(0.5);
  drawDashedLine(doc.y);
  doc.moveDown(0.5);

  // IMPORTANT NOTES
  doc.font(fontBold).fontSize(12).text('IMPORTANT NOTES:', 40, doc.y).moveDown(0.5);
  doc.font(fontNormal).fontSize(11);
  doc.text('* Handle with care', 40, doc.y);
  doc.text('* Do not accept if package is damaged', 40, doc.y);

  doc.moveDown(0.5);
  drawDashedLine(doc.y);
  doc.moveDown(1);

  // BARCODE PLACEHOLDER BOX
  const boxTop = doc.y;
  doc.rect(40, boxTop, 515, 60).stroke();
  doc.font(fontBold).fontSize(12).text('[ BARCODE / QR CODE HERE ]', 40, boxTop + 24, { align: 'center', width: 515 });

  doc.end();
}

module.exports = { generateDeliveryLabel };
