"use client";
import ReactJsonView from "@microlink/react-json-view";
import { useEffect, useRef } from "react";

type JsonViewProps = { header: string; data: object };

function JsonView({ header, data }: JsonViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const moveMetadata = () => {
      containerRef.current
        ?.querySelectorAll(".object-meta-data")
        .forEach((meta) => {
          const keyVal = meta.closest(".object-key-val");
          if (!keyVal) return;

          const openingSpan = keyVal.querySelector(":scope > span:first-child");
          if (!openingSpan) return;

          if (openingSpan.nextElementSibling !== meta) {
            openingSpan.after(meta);
          }
        });
    };

    const timeout = setTimeout(moveMetadata, 100);

    // look for expand/collapse
    const observer = new MutationObserver(() => {
      requestAnimationFrame(moveMetadata);
    });

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [data]);

  return (
    <div ref={containerRef}>
      <ReactJsonView
        src={data}
        displayDataTypes={false}
        displayArrayKey={false}
        // ReactJsonView's typescript has incorrect typing so this is a way around it
        {...{ showComma: false }}
      />
    </div>
  );
}

export default JsonView;
