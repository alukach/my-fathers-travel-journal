import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import type { ImageProps } from "next/image";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="text-4xl font-bold mt-8 mb-4">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-3xl font-semibold mt-6 mb-3">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-2xl font-semibold mt-4 mb-2">{children}</h3>
    ),
    p: ({ children }) => <p className="mb-4 leading-7">{children}</p>,
    ul: ({ children }) => <ul className="list-disc ml-6 mb-4">{children}</ul>,
    ol: ({ children }) => (
      <ol className="list-decimal ml-6 mb-4">{children}</ol>
    ),
    li: ({ children }) => <li className="mb-2">{children}</li>,
    a: ({ href, children }) => (
      <a
        href={href}
        className="text-blue-600 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    img: (props) => (
      <Image
        {...(props as ImageProps)}
        width={800}
        height={600}
        className="rounded-lg my-4"
        alt={props.alt || ""}
      />
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4">
        {children}
      </blockquote>
    ),
    ...components,
  };
}
