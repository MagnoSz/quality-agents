// One illustration from the cat library (icons/cats.ts). Decorative by default.
import { catSrc } from '../icons/cats';

interface Props { id: string; size?: number; title?: string }

export function CatIcon({ id, size = 40, title }: Props) {
  return <img className="cat-icon" src={catSrc(id)} width={size} height={size} alt={title ?? ''} title={title} draggable={false} />;
}
