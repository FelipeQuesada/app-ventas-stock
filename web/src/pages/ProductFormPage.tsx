import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PRODUCT_CATEGORIES } from '@advance-coat/shared';
import { createProduct, getProduct, updateProduct } from '../services/products';

export function ProductFormPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(PRODUCT_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    (async () => {
      try {
        const product = await getProduct(id!);
        if (!product) {
          setError('Producto no encontrado');
          return;
        }
        if (!cancelled) {
          setName(product.name);
          setCategory(product.category);
          setDescription(product.description);
          setPrice(String(product.price));
          setStock(String(product.stock));
          setImageUrl(product.imageUrl);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        category,
        description: description.trim(),
        price: Number(price) || 0,
        stock: Number(stock) || 0,
        imageUrl,
      };
      if (!data.name) throw new Error('El nombre es obligatorio');
      if (isNew) {
        await createProduct(data, imageFile);
      } else {
        await updateProduct(id!, data, imageFile);
      }
      navigate('/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-screen">Cargando…</div>;

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-header">
        <div>
          <h3 style={{ margin: 0 }}>{isNew ? 'Nuevo producto' : 'Editar producto'}</h3>
          <p>Completá los datos del catálogo</p>
        </div>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Categoría</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Precio</label>
            <input
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Stock</label>
            <input
              type="number"
              min="0"
              step="1"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label>Descripción</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Imagen</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0])}
          />
          {imageUrl && !imageFile ? (
            <img
              src={imageUrl}
              alt=""
              style={{ marginTop: 8, maxWidth: 160, borderRadius: 8 }}
            />
          ) : null}
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/products')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
