// Square product image for the order editor; a neutral placeholder when there is no image.
export default function ProductThumb({ url, title }) {
  return (
    <div className="edit-thumb">
      {url ? <img src={url} alt={title || ''} loading="lazy" /> : <span aria-hidden="true">{(title || '?').trim().charAt(0).toUpperCase()}</span>}
    </div>
  );
}
