interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

export const SkipLink = ({ href, children }: SkipLinkProps) => {
  return (
    <a 
      href={href} 
      className="skip-link"
      onClick={(e) => {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target && target instanceof HTMLElement) {
          target.focus();
          target.scrollIntoView();
        }
      }}
    >
      {children}
    </a>
  );
};