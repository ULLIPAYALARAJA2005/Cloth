const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { upload, uploadToFirebase } = require('../middleware/upload');

// GET /api/products — public, with filters
router.get('/', async (req, res) => {
  try {
    const { category, minPrice, maxPrice, size, color, sort, search, page = 1, limit = 12 } = req.query;
    let query = {};
    if (category && category !== 'all' && category !== 'All') query.category = category;
    if (color) query.colors = color;

    let products = await Product.find(query).lean();

    // In-memory filters
    if (search) {
      const s = search.toLowerCase();
      products = products.filter(p =>
        p.name?.toLowerCase().includes(s) ||
        p.description?.toLowerCase().includes(s) ||
        p.tags?.some(t => t.toLowerCase().includes(s))
      );
    }
    if (size) products = products.filter(p => p.sizes?.some(s => s.size === size && s.qty > 0));
    if (minPrice || maxPrice) {
      products = products.filter(p => {
        const prices = p.hasSizes === false ? [p.price] : (p.sizes?.map(s => s.price) || [0]);
        const min = Math.min(...prices);
        return (!minPrice || min >= Number(minPrice)) && (!maxPrice || min <= Number(maxPrice));
      });
    }

    if (sort === 'popular') products.sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
    else if (sort === 'newest') products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sort === 'price_asc') {
      products.sort((a, b) => {
        const p1 = a.hasSizes === false ? (a.price || 0) : Math.min(...(a.sizes?.map(s => s.price) || [0]));
        const p2 = b.hasSizes === false ? (b.price || 0) : Math.min(...(b.sizes?.map(s => s.price) || [0]));
        return p1 - p2;
      });
    }
    else if (sort === 'price_desc') {
      products.sort((a, b) => {
        const p1 = a.hasSizes === false ? (a.price || 0) : Math.min(...(a.sizes?.map(s => s.price) || [0]));
        const p2 = b.hasSizes === false ? (b.price || 0) : Math.min(...(b.sizes?.map(s => s.price) || [0]));
        return p2 - p1;
      });
    }
    const formatImage = img => {
      if (typeof img === 'string') return img.replace(/ /g, '%20');
      if (img && typeof img === 'object' && img.url) return { ...img, url: img.url.replace(/ /g, '%20') };
      return img;
    };

    products = products.map(p => ({ ...p, id: p._id.toString(), images: (p.images || []).map(formatImage) }));

    const total = products.length;
    const start = (Number(page) - 1) * Number(limit);
    const paginated = products.slice(start, start + Number(limit));
    res.json({ products: paginated, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/products/categories/list
router.get('/categories/list', async (req, res) => {
  try {
    const cats = await Product.distinct('category');
    res.json(cats.filter(Boolean));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/products/:id — public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    const formatImage = img => {
      if (typeof img === 'string') return img.replace(/ /g, '%20');
      if (img && typeof img === 'object' && img.url) return { ...img, url: img.url.replace(/ /g, '%20') };
      return img;
    };

    const data = { ...product, id: product._id.toString(), images: (product.images || []).map(formatImage) };
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/products — admin only
router.post('/', upload.array('images', 8), async (req, res) => {
  try {
    const { name, description, category, sizes, colors, tags, imageColors, hasSizes, price, mrp, quantity } = req.body;
    const parsedImageColors = typeof imageColors === 'string' ? JSON.parse(imageColors) : (imageColors || []);
    
    const imageUrls = [];
    if (req.files?.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const url = await uploadToFirebase(req.files[i], 'products');
        imageUrls.push({ url, color: parsedImageColors[i] || 'All' });
      }
    }
    const parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
    const parsedColors = typeof colors === 'string' ? JSON.parse(colors) : colors;
    const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : (tags || []);

    const product = await Product.create({ 
      name, description, category, images: imageUrls, sizes: parsedSizes, colors: parsedColors, tags: parsedTags,
      hasSizes: hasSizes === 'true' || hasSizes === true,
      price: Number(price) || 0,
      mrp: Number(mrp) || 0,
      quantity: Number(quantity) || 0
    });
    res.status(201).json({ ...product.toObject(), id: product._id.toString() });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/products/:id — admin only
router.put('/:id', upload.array('images', 8), async (req, res) => {
  try {
    const { name, description, category, sizes, colors, tags, existingImages, imageColors, hasSizes, price, mrp, quantity } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    let rawExisting = existingImages
      ? (typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages)
      : product.images || [];

    // Normalize to objects and deduplicate by URL (to prevent admin bugs)
    let imageUrls = [];
    let seenUrls = new Set();
    rawExisting.forEach(img => {
      const url = typeof img === 'string' ? img : img.url;
      const color = typeof img === 'string' ? 'All' : (img.color || 'All');
      if (url && !seenUrls.has(url)) {
        seenUrls.add(url);
        imageUrls.push({ url, color });
      }
    });

    const parsedImageColors = typeof imageColors === 'string' ? JSON.parse(imageColors) : (imageColors || []);

    if (req.files?.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const url = await uploadToFirebase(req.files[i], 'products');
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          imageUrls.push({ url, color: parsedImageColors[i] || 'All' });
        }
      }
    }
    const parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
    const parsedColors = typeof colors === 'string' ? JSON.parse(colors) : colors;
    const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : (tags || []);

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { 
        name, description, category, images: imageUrls, sizes: parsedSizes, colors: parsedColors, tags: parsedTags,
        hasSizes: (hasSizes === 'true' || hasSizes === true),
        price: Number(price) || 0,
        mrp: Number(mrp) || 0,
        quantity: Number(quantity) || 0
      },
      { new: true }
    );
    res.json({ ...updated.toObject(), id: updated._id.toString() });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/products/:id — admin only
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
