const PDFDocument = require('pdfkit');

function generateInvoice(order, res) {
  // Create a document
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  // Pipe its output to the response
  doc.pipe(res);

  // Helper functions for layout
  function generateHeader(doc) {
    doc
      .fillColor('#444444')
      .fontSize(20)
      .text('INVOICE', 50, 45, { align: 'right' })
      .fontSize(10)
      .text('Kalyani Fashion Hub', 50, 45)
      .text('123 Fashion Street, Style City', 50, 60)
      .text('Phone: +91 9876543210', 50, 75)
      .text('Email: support@kalyanifashionhub.com', 50, 90)
      .moveDown();
  }

  function generateCustomerInformation(doc, order) {
    doc
      .fillColor('#444444')
      .fontSize(12)
      .text('Invoice Details', 50, 130)
      .moveTo(50, 145)
      .lineTo(550, 145)
      .lineWidth(0.5)
      .stroke();

    const customerAddress = order.address ? `${order.address.street || ''}, ${order.address.city || ''}\n${order.address.state || ''} ${order.address.pinCode || ''}` : 'N/A';

    doc
      .fontSize(10)
      .text(`Order ID: ${order._id}`, 50, 160)
      .text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, 175)
      .text(`Status: ${order.status.toUpperCase()}`, 50, 190)
      .text(`Payment: UPI (Txn: ${order.transactionId || 'N/A'})`, 50, 205)
      
      .text('Billed To:', 300, 160)
      .font('Helvetica-Bold')
      .text(order.userName || 'Customer', 300, 175)
      .font('Helvetica')
      .text(order.phone || 'N/A', 300, 190)
      .text(customerAddress, 300, 205)
      .moveDown();
  }

  function generateInvoiceTable(doc, order) {
    let i,
      invoiceTableTop = 300;

    doc.font('Helvetica-Bold');
    generateTableRow(
      doc,
      invoiceTableTop,
      'Item',
      'Size/Color',
      'Qty',
      'Price',
      'Total'
    );
    generateHr(doc, invoiceTableTop + 20); // Header divider
    doc.font('Helvetica');

    let position = 0;
    
    // Draw the items
    for (i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      position = invoiceTableTop + (i + 1) * 30;
      const itemTotal = item.price * item.quantity;

      generateTableRow(
        doc,
        position,
        item.name.substring(0, 30) + (item.name.length > 30 ? '...' : ''),
        `${item.size || '-'} / ${item.color || '-'}`,
        item.quantity,
        `Rs. ${item.price}`,
        `Rs. ${itemTotal}`
      );
      generateHr(doc, position + 20);
    }

    // Subtotal and Total
    const totalPosition = position + 40;
    doc.font('Helvetica-Bold');
    generateTableRow(
      doc,
      totalPosition,
      '',
      '',
      '',
      'Total Amount:',
      `Rs. ${order.totalAmount || 0}`
    );
    doc.font('Helvetica');
  }

  function generateTableRow(doc, y, item, description, qty, price, total) {
    doc
      .fontSize(10)
      .text(item, 50, y)
      .text(description, 280, y)
      .text(qty, 380, y, { width: 40, align: 'center' })
      .text(price, 430, y, { width: 50, align: 'right' })
      .text(total, 490, y, { width: 60, align: 'right' });
  }

  function generateHr(doc, y) {
    doc
      .strokeColor('#aaaaaa')
      .lineWidth(0.5)
      .moveTo(50, y)
      .lineTo(550, y)
      .stroke();
  }

  function generateFooter(doc) {
    doc.fontSize(10).text(
      'Thank you for shopping with Kalyani Fashion Hub.',
      50,
      700,
      { align: 'center', width: 500 }
    );
  }

  // Build PDF document
  generateHeader(doc);
  generateCustomerInformation(doc, order);
  generateInvoiceTable(doc, order);
  generateFooter(doc);

  // Finalize the PDF and end the stream
  doc.end();
}

module.exports = { generateInvoice };
