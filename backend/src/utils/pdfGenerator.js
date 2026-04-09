const PDFDocument = require('pdfkit');

function generateInvoice(order, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  const fontBold = 'Helvetica-Bold';
  const fontNormal = 'Helvetica';

  // Helper formats
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
    .text('Phone: +91 9652300993 | Email: support@kalyani.com', { align: 'center' })
    .moveDown(1);

  // DASHED LINE
  function drawDashedLine(y) {
    doc.lineWidth(1).dash(3, { space: 3 }).moveTo(40, y).lineTo(555, y).stroke().undash();
  }

  drawDashedLine(doc.y);
  doc.moveDown(0.5);

  // TAX INVOICE TITLE
  doc.font(fontBold).fontSize(14).text('TAX INVOICE', { align: 'center' }).moveDown(0.5);

  // INVOICE META
  doc.font(fontNormal).fontSize(10);
  doc.text(`Invoice No: ${invoiceNo}`);
  doc.text(`Order ID: ${orderId}`);
  doc.text(`Order Date: ${formatDate(order.createdAt)}`);
  doc.text(`Payment Method: UPI`);
  doc.text(`Transaction ID: ${order.transactionId || 'N/A'}`);
  doc.text(`Transaction Phone: ${order.phone || 'N/A'}`);
  doc.moveDown(0.5);
  drawDashedLine(doc.y);
  doc.moveDown(0.5);

  // BILL TO
  doc.font(fontBold).text('BILL TO:').moveDown(0.5);
  doc.font(fontNormal)
    .text(`Customer Name: ${order.userName || 'N/A'}`)
    .text(`Phone: ${order.phone || 'N/A'}`)
    .text('Address:');
  
  if (order.address) {
    if (order.address.street) doc.text(order.address.street);
    const cityStatePin = [order.address.city, order.address.state, order.address.pinCode].filter(Boolean).join(', ');
    if (cityStatePin) doc.text(cityStatePin);
  } else {
    doc.text('N/A');
  }

  doc.moveDown(0.5);
  drawDashedLine(doc.y);
  doc.moveDown(0.5);

  // PRODUCT DETAILS
  doc.font(fontBold).text('PRODUCT DETAILS:').moveDown(0.5);

  // Table Headers
  let tableTop = doc.y;
  doc.fontSize(9);
  
  // Headers X positions
  const xName = 40;
  const xSize = 250;
  const xColor = 290;
  const xQty = 330;
  const xMRP = 360;
  const xSale = 410;
  const xDisc = 460;
  const xTotal = 510;

  doc.text('Product Name', xName, tableTop);
  doc.text('Size', xSize, tableTop);
  doc.text('Color', xColor, tableTop);
  doc.text('Qty', xQty, tableTop);
  doc.text('MRP', xMRP, tableTop);
  doc.text('Sale Price', xSale, tableTop);
  doc.text('Discount', xDisc, tableTop);
  doc.text('Total', xTotal, tableTop);

  doc.moveTo(40, doc.y + 5).lineTo(555, doc.y + 5).lineWidth(0.5).stroke();
  
  let y = doc.y + 10;
  doc.font(fontNormal);

  let totalMRP = 0;
  let totalSalePriceItems = 0;

  order.items.forEach(item => {
    // If table overlaps bottom, add a page
    if (y > 750) {
      doc.addPage();
      y = 40;
    }

    const mrp = Number(item.mrp) || Number(item.price);
    const salePrice = Number(item.price);
    const qty = Number(item.quantity);
    const itemTotalMRP = mrp * qty;
    const itemTotalSale = salePrice * qty;

    totalMRP += itemTotalMRP;
    totalSalePriceItems += itemTotalSale;

    let discountStr = '0% OFF';
    if (mrp > salePrice) {
      const discountPercent = Math.round(((mrp - salePrice) / mrp) * 100);
      discountStr = `${discountPercent}% OFF`;
    }

    doc.text(item.name.substring(0, 45) + (item.name.length > 45 ? '...' : ''), xName, y, { width: 200 });
    doc.text(item.size || '-', xSize, y);
    doc.text(item.color || '-', xColor, y);
    doc.text(qty, xQty, y);
    doc.text(`₹${mrp}`, xMRP, y);
    doc.text(`₹${salePrice}`, xSale, y);
    doc.text(discountStr, xDisc, y);
    doc.text(`₹${itemTotalSale}`, xTotal, y);
    
    y += 20;
  });

  doc.y = y;
  doc.moveDown(0.5);
  drawDashedLine(doc.y);
  doc.moveDown(0.5);

  // PRICE SUMMARY
  doc.font(fontBold).fontSize(10).text('PRICE SUMMARY:').moveDown(0.5);
  doc.font(fontNormal);

  const finalAmount = order.totalAmount || totalSalePriceItems; // Trusting order.totalAmount
  // If order totalamount has coupons applied, the discount is totalMRP - finalAmount
  const totalDiscount = totalMRP - finalAmount;

  doc.text(`Total MRP: ₹${totalMRP}`);
  doc.text(`Total Discount: -₹${totalDiscount > 0 ? totalDiscount : 0}`);
  doc.font(fontBold).text(`Final Amount: ₹${finalAmount}`);
  
  doc.moveDown(0.5);
  drawDashedLine(doc.y);
  doc.moveDown(0.5);

  // DELIVERY DETAILS
  doc.font(fontBold).text('DELIVERY DETAILS:').moveDown(0.5);
  doc.font(fontNormal);
  
  // Status capitalization
  const capStatus = order.status.charAt(0).toUpperCase() + order.status.slice(1);
  doc.text(`Status: ${capStatus}`);
  
  if (order.status === 'delivered' && order.deliveredAt) {
    doc.text(`Delivery Date: ${formatDate(order.deliveredAt)}`);
  } else if (order.status === 'shipped' && order.shippedAt) {
    doc.text(`Shipped Date: ${formatDate(order.shippedAt)}`);
  }

  doc.moveDown(0.5);
  drawDashedLine(doc.y);
  doc.moveDown(0.5);

  // FOOTER
  doc.text('Thank you for shopping with us!', { align: 'center' });
  doc.text('Visit again 😊', { align: 'center' });

  doc.end();
}

module.exports = { generateInvoice };
