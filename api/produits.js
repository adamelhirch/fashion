const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Tous les produits
router.get('/', (req, res) => {
  db.query('SELECT * FROM produit', async (err, produits) => {
    if (err) return res.status(500).json(err);

    try {
      const results = await Promise.all(produits.map(async p => {
        // Récupérer les images
        const [images] = await new Promise((resolve, reject) => {
          db.query('SELECT id FROM image WHERE produit_id = ? ORDER BY ordre', [p.id], (err, data) => {
            if (err) reject(err);
            else resolve([data]);
          });
        });

        // Ajouter les images à chaque produit
        p.images = images.map(img => `http://localhost:4000/produits/image/${img.id}`);

        // Calculer le prix après promotion si une promotion est définie
        if (p.promotion > 0) {
          p.prix = (p.prix - (p.prix * p.promotion) / 100).toFixed(2); // Appliquer la réduction
        }

        return p;
      }));

      res.json(results);
    } catch (e) {
      res.status(500).json({ error: 'Erreur lors de la récupération des images' });
    }
  });
});

router.get('/vedettes', (req, res) => {
  db.query('SELECT * FROM produit WHERE vedette = 1', async (err, produits) => {
    if (err) return res.status(500).json(err);

    try {
      const results = await Promise.all(produits.map(async p => {
        // Récupérer les images
        const [images] = await new Promise((resolve, reject) => {
          db.query('SELECT id FROM image WHERE produit_id = ? ORDER BY ordre', [p.id], (err, data) => {
            if (err) reject(err);
            else resolve([data]);
          });
        });

        // Ajouter les images à chaque produit
        p.images = images.map(img => `http://localhost:4000/produits/image/${img.id}`);

        // Calculer le prix après promotion si une promotion est définie
        if (p.promotion > 0) {
          p.prix = (p.prix - (p.prix * p.promotion) / 100).toFixed(2); // Appliquer la réduction
        }

        return p;
      }));

      res.json(results);
    } catch (e) {
      res.status(500).json({ error: 'Erreur lors de la récupération des images' });
    }
  });
});


// Mise à jour des produits vedettes
router.patch('/:id', (req, res) => {
  const id = req.params.id;
  const { vedette, promotion } = req.body;

  // Mettre à jour le produit pour qu'il soit en vedette ou pas
  db.query('UPDATE produit SET vedette = ?, promotion = ? WHERE id = ?', [vedette, promotion, id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Produit mis à jour' });
  });
});

// Ajouter un produit
router.post('/', (req, res) => {
  let { nom, description, prix, reference, tailles, promotion } = req.body;

  try {
    if (typeof tailles === 'string') {
      tailles = JSON.parse(tailles);
    }
  } catch {
    tailles = [];
  }

  db.query(
    'INSERT INTO produit (nom, description, prix, reference, tailles, promotion) VALUES (?, ?, ?, ?, ?, ?)',
    [nom, description, prix, reference, JSON.stringify(tailles), promotion || 0], // Default to 0 if no promotion
    (err, data) => {
      if (err) return res.status(500).json(err);
      res.json({ id: data.insertId });
    }
  );
});

// Ajouter des images à un produit
router.post('/:id/images', upload.array('images'), (req, res) => {
  const produitId = req.params.id;
  const images = req.files;

  const values = images.map((file, index) => [produitId, file.buffer, file.mimetype, index + 1]);

  db.query(
    'INSERT INTO image (produit_id, image_blob, mime_type, ordre) VALUES ?',
    [values],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: 'Images ajoutées' });
    }
  );
});

// Récupérer un produit et ses images par ID
router.get('/:id', (req, res) => {
  const id = req.params.id;
  const baseUrl = req.protocol + '://' + req.get('host');

  db.query('SELECT * FROM produit WHERE id = ?', [id], (err, produitData) => {
    if (err) return res.status(500).json(err);
    if (produitData.length === 0) return res.status(404).json({ message: 'Produit non trouvé' });

    const produit = produitData[0];

    db.query(
      'SELECT id FROM image WHERE produit_id = ? ORDER BY ordre',
      [id],
      (err2, imagesData) => {
        if (err2) return res.status(500).json(err2);

        produit.images = imagesData.length > 0
          ? imagesData.map(img => `${baseUrl}/produits/image/${img.id}`)
          : [`${baseUrl}/placeholder.png`];

        // Calculer le prix après promotion
        if (produit.promotion > 0) {
          produit.prix = (produit.prix - (produit.prix * produit.promotion) / 100).toFixed(2);
        }

        res.json(produit);
      }
    );
  });
});

// Récupérer une image spécifique par ID
router.get('/image/:id', (req, res) => {
  const imageId = req.params.id;

  db.query('SELECT mime_type, image_blob FROM image WHERE id = ?', [imageId], (err, data) => {
    if (err) return res.status(500).json(err);
    if (data.length === 0) return res.status(404).json({ message: 'Image non trouvée' });

    const image = data[0];

    res.writeHead(200, { 'Content-Type': image.mime_type });
    res.end(image.image_blob);
  });
});

// Update product
router.put('/:id', (req, res) => {
  const { nom, description, prix, reference, tailles, vedette, promotion } = req.body;
  
  db.query(
    'UPDATE produit SET nom = ?, description = ?, prix = ?, reference = ?, tailles = ?, vedette = ?, promotion = ? WHERE id = ?',
    [nom, description, prix, reference, JSON.stringify(tailles), vedette, promotion, req.params.id],
    (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur lors de la modification du produit' });
        return;
      }
      if (result.affectedRows === 0) {
        res.status(404).json({ message: 'Produit non trouvé' });
        return;
      }
      res.json({ id: req.params.id, ...req.body });
    }
  );
});

// Delete product
router.delete('/:id', (req, res) => {
  db.query('DELETE FROM produit WHERE id = ?', [req.params.id], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: 'Erreur lors de la suppression du produit' });
      return;
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ message: 'Produit non trouvé' });
      return;
    }
    res.json({ message: 'Produit supprimé avec succès' });
  });
});

// Delete image
router.delete('/:id/images', (req, res) => {
  const { imageUrl } = req.body;
  const produitId = req.params.id;

  // Extract the image ID from the URL
  const imageId = imageUrl.split('/').pop();

  db.query(
    'DELETE FROM image WHERE id = ? AND produit_id = ?',
    [imageId, produitId],
    (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur lors de la suppression de l\'image' });
        return;
      }
      if (result.affectedRows === 0) {
        res.status(404).json({ message: 'Image non trouvée' });
        return;
      }
      res.json({ message: 'Image supprimée avec succès' });
    }
  );
});

// Update image order
router.put('/:id/images/order', (req, res) => {
  const { images } = req.body;
  const produitId = req.params.id;
  
  if (!Array.isArray(images)) {
    return res.status(400).json({ message: 'Images must be an array' });
  }

  // Start a transaction
  db.beginTransaction(err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'ordre des images' });
    }

    // Update the order for each image
    const updatePromises = images.map((imageUrl, index) => {
      return new Promise((resolve, reject) => {
        // Extract the image ID from the URL
        const imageId = imageUrl.split('/').pop();
        
        db.query(
          'UPDATE image SET ordre = ? WHERE id = ? AND produit_id = ?',
          [index, imageId, produitId],
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          }
        );
      });
    });

    Promise.all(updatePromises)
      .then(() => {
        // Commit the transaction
        db.commit(err => {
          if (err) {
            return db.rollback(() => {
              console.error(err);
              res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'ordre des images' });
            });
          }
          res.json({ message: 'Ordre des images mis à jour avec succès', images });
        });
      })
      .catch(err => {
        // Rollback in case of error
        db.rollback(() => {
          console.error(err);
          res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'ordre des images' });
        });
      });
  });
});

module.exports = router;
