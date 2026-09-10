import Image from 'next/image';

export function MdxImage({ src, alt, width, height, sizes, className = '', style, ...props }) {
  // Keep the source aspect ratio separate from the article's display width.
  // Static imports and remote image objects both include intrinsic dimensions.
  const image = typeof src === 'object' && src !== null ? (src.default ?? src) : null;
  const displayWidth = width == null ? undefined : Number(width);

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      width={image?.width ?? width}
      height={image?.height ?? height}
      sizes={sizes ?? (displayWidth ? `(max-width: ${displayWidth}px) 100vw, ${displayWidth}px` : undefined)}
      className={`m-1 ${className}`.trim()}
      style={{ width: displayWidth, maxWidth: '100%', height: 'auto', ...style }}
    />
  );
}
