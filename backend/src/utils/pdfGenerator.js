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
    .text('KALYANI FASHION HUB', 40, doc.y, { align: 'center', width: 515 })
    .font(fontNormal).fontSize(10)
    .text('2nd Floor, Main Road, Andhra Pradesh', 40, doc.y, { align: 'center', width: 515 })
    .text('Phone: +91 9652300993 | Email: support@kalyani.com', 40, doc.y, { align: 'center', width: 515 })
    .moveDown(1);

  // DASHED LINE
  function drawDashedLine(y) {
    doc.lineWidth(1).dash(3, { space: 3 }).moveTo(40, y).lineTo(555, y).stroke().undash();
  }

  drawDashedLine(doc.y);
  doc.moveDown(0.5);

  // TAX INVOICE TITLE
  doc.font(fontBold).fontSize(14).text('TAX INVOICE', 40, doc.y, { align: 'center', width: 515 }).moveDown(0.5);

  // INVOICE META
  doc.font(fontNormal).fontSize(10);
  doc.text(`Invoice No: ${invoiceNo}`, 40, doc.y, { align: 'left' });
  doc.text(`Order ID: ${orderId}`, 40, doc.y, { align: 'left' });
  doc.text(`Order Date: ${formatDate(order.createdAt)}`, 40, doc.y, { align: 'left' });
  doc.text(`Payment Method: UPI`, 40, doc.y, { align: 'left' });
  doc.text(`Transaction ID: ${order.transactionId || 'N/A'}`, 40, doc.y, { align: 'left' });
  doc.text(`Transaction Phone: ${order.phone || 'N/A'}`, 40, doc.y, { align: 'left' });
  doc.moveDown(0.5);
  drawDashedLine(doc.y);
  doc.moveDown(0.5);

  // BILL TO
  doc.font(fontBold).text('BILL TO:', 40, doc.y, { align: 'left' }).moveDown(0.5);
  doc.font(fontNormal)
    .text(`Customer Name: ${order.userName || 'N/A'}`, 40, doc.y, { align: 'left' })
    .text(`Phone: ${order.address?.phone || order.phone || 'N/A'}`, 40, doc.y, { align: 'left' })
    .text('Address:', 40, doc.y, { align: 'left' });
  
  if (order.address) {
    if (order.address.street) doc.text(order.address.street, 40, doc.y, { align: 'left' });
    const cityStatePin = [order.address.city, order.address.state, order.address.pinCode].filter(Boolean).join(', ');
    if (cityStatePin) doc.text(cityStatePin, 40, doc.y, { align: 'left' });
  } else {
    doc.text('N/A', 40, doc.y, { align: 'left' });
  }

  doc.moveDown(0.5);
  drawDashedLine(doc.y);
  doc.moveDown(0.5);

  // PRODUCT DETAILS
  doc.font(fontBold).text('PRODUCT DETAILS:', 40, doc.y, { align: 'left' }).moveDown(0.5);

  let tableTop = doc.y;
  doc.fontSize(9);
  
  // Adjusted columns to give more breathing room
  const xName = 40;
  const xSize = 250;
  const xColor = 290;
  const xQty = 330;
  const xMRP = 360;
  const xSale = 410;
  const xDisc = 470;
  const xTotal = 520;

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

    doc.text(item.name.substring(0, 45) + (item.name.length > 45 ? '...' : ''), xName, y, { width: 200, align: 'left' });
    doc.text(item.size || '-', xSize, y, { width: 40 });
    doc.text(item.color || '-', xColor, y, { width: 40 });
    doc.text(qty, xQty, y, { width: 20 });
    doc.text(`Rs. ${mrp}`, xMRP, y, { width: 50 });
    doc.text(`Rs. ${salePrice}`, xSale, y, { width: 50 });
    doc.text(discountStr, xDisc, y, { width: 50 });
    doc.text(`Rs. ${itemTotalSale}`, xTotal, y, { width: 60 });
    
    y = doc.y + 5; // Use auto-wrapped y 
  });

  doc.y = y;
  doc.moveDown(0.5);
  drawDashedLine(doc.y);
  doc.moveDown(0.5);

  // Reset text alignment and position for summary
  doc.x = 40;
  
  // PRICE SUMMARY
  doc.font(fontBold).fontSize(10).text('PRICE SUMMARY:', 40, doc.y, { align: 'left', width: 500 }).moveDown(0.5);
  doc.font(fontNormal);

  const finalAmount = order.totalAmount || totalSalePriceItems; 
  const totalDiscount = totalMRP - finalAmount;

  doc.text(`Total MRP: Rs. ${totalMRP}`, 40, doc.y, { align: 'left', width: 500 });
  doc.text(`Total Discount: -Rs. ${totalDiscount > 0 ? totalDiscount : 0}`, 40, doc.y, { align: 'left', width: 500 });

  if (order.couponCode) {
    doc.text(`Coupon Applied: ${order.couponCode}`, 40, doc.y, { align: 'left', width: 500 });
  }

  doc.font(fontBold).text(`Final Amount: Rs. ${finalAmount}`, 40, doc.y, { align: 'left', width: 500 });
  
  doc.moveDown(0.5);
  drawDashedLine(doc.y);
  doc.moveDown(0.5);

  // DELIVERY DETAILS
  doc.font(fontBold).text('DELIVERY DETAILS:', 40, doc.y, { align: 'left', width: 500 }).moveDown(0.5);
  doc.font(fontNormal);
  
  const capStatus = order.status.charAt(0).toUpperCase() + order.status.slice(1);
  doc.text(`Status: ${capStatus}`, 40, doc.y, { align: 'left', width: 500 });
  
  if (order.status === 'delivered' && order.deliveredAt) {
    doc.text(`Delivery Date: ${formatDate(order.deliveredAt)}`, 40, doc.y, { align: 'left', width: 500 });
  } else if (order.status === 'shipped' && order.shippedAt) {
    doc.text(`Shipped Date: ${formatDate(order.shippedAt)}`, 40, doc.y, { align: 'left', width: 500 });
  }

  doc.moveDown(0.5);
  drawDashedLine(doc.y);
  doc.moveDown(0.5);

  // FOOTER
  doc.text('Thank you for shopping with us!', 40, doc.y, { align: 'center', width: 515 });
  doc.text('Visit again 😊', 40, doc.y, { align: 'center', width: 515 });

  doc.end();
}

module.exports = { generateInvoice };
