import { mockImages } from "@/lib/mock-data";
export function ImageCard({ index }: { index: number }) {
  const image = mockImages[index];
  return (
    <figure className="article-image">
      <div>
        <img src={image.src} alt={image.description} />
        <span className="image-number">图 {image.image_order} · 示例插画</span>
      </div>
      <figcaption>
        <span>{image.tag}</span>
        {image.description}
      </figcaption>
    </figure>
  );
}
export function TitleCard({
  title,
  index,
  selected,
  onSelect,
}: {
  title: string;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={"title-card " + (selected ? "selected" : "")}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="title-index">0{index + 1}</span>
      <span>
        <small>{["正式型", "温暖型", "主题/成果导向型"][index]}</small>
        <strong>{title}</strong>
      </span>
      <span className="radio-dot" />
    </button>
  );
}
