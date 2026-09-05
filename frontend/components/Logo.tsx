import Link from "next/link";

// Site logo — served as a static asset from /public
export const LOGO_SRC = "/logo.png";

type LogoImageProps = {
  className?: string;
  alt?: string;
};

/** Just the logo image, sized via className. */
export function LogoImage({
  className = "h-[80px] w-[200px] rounded-lg object-cover",
  alt = "Quick Food logo",
}: LogoImageProps) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={LOGO_SRC} alt={alt} className={className} />;
}

type BrandLogoProps = {
  href?: string;
  text?: string;
  className?: string;
  imageClassName?: string;
  textClassName?: string;
};

/** Logo + wordmark wrapped in a link — the standard nav brand. */
export default function BrandLogo({
  href = "/",
  className = "flex items-center gap-2",
  imageClassName = "h-[80px] w-[200px] rounded-lg object-cover",
  textClassName = "text-2xl font-bold text-orange-600",
}: BrandLogoProps) {
  return (
    <Link href={href} className={className}>
      <LogoImage className={imageClassName} />
    </Link>
  );
}