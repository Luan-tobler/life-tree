import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Life Tree — Cultive sua árvore da vida" },
      {
        name: "description",
        content:
          "Life Tree é um protótipo interativo onde você cultiva uma árvore que cresce com seus hábitos, humor e clima.",
      },
      { property: "og:title", content: "Life Tree — Cultive sua árvore da vida" },
      {
        property: "og:description",
        content:
          "Um protótipo interativo onde você cultiva uma árvore que cresce com seus hábitos, humor e clima.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LifeTree,
});

function LifeTree() {
  return (
    <iframe
      src="/life-tree.html"
      title="Life Tree"
      style={{
        border: "none",
        width: "100vw",
        height: "100vh",
        display: "block",
      }}
    />
  );
}
