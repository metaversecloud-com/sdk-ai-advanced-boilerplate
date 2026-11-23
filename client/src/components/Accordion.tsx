import { ReactNode } from "react";

export const Accordion = ({ children, title }: { children: ReactNode; title: string }) => {
  return (
    <section id="accordion" className="accordion">
      <div className="accordion-container">
        <details className="accordion-item">
          <summary className="accordion-trigger">
            <span className="accordion-title h4">{title}</span>
            <img
              className="accordion-icon"
              aria-hidden="true"
              src="https://sdk-style.s3.amazonaws.com/icons/chevronDown.svg"
            />
          </summary>
          <div className="accordion-content mt-4">{children}</div>
        </details>
      </div>
    </section>
  );
};

export default Accordion;
