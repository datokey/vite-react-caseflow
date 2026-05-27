import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

export const createEditorExtensions = (placeholder = "Tulis konten artikel...") => [
  StarterKit.configure({
    heading: {
      levels: [2, 3],
    },
    link: false,
    underline: false,
  }),
  Underline,
  Link.configure({
    autolink: true,
    openOnClick: false,
    HTMLAttributes: {
      class: "text-indigo-600 underline underline-offset-2",
    },
  }),
  Image.configure({
    allowBase64: true,
    HTMLAttributes: {
      class: "my-4 max-h-[28rem] w-full rounded-lg object-contain",
    },
  }),
  Placeholder.configure({
    placeholder,
  }),
];
