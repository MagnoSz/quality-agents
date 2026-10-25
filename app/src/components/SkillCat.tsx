// A skill's cat, as a button that opens the cat library to change it.
import { useState } from 'react';
import { t } from '../i18n';
import { setSkillCat, skillCat } from '../icons/cats';
import { CatIcon } from './CatIcon';
import { CatPicker } from './CatPicker';

interface Props { name: string; size?: number }

export function SkillCat({ name, size = 36 }: Props) {
  const [cat, setCat] = useState(() => skillCat(name));
  const [picking, setPicking] = useState(false);
  return (
    <>
      <button type="button" className="skill-cat" onClick={() => setPicking(true)} title={t('Change the icon of {name}', { name })} aria-label={t('Change the icon of {name}', { name })}>
        <CatIcon id={cat} size={size} />
      </button>
      {picking && <CatPicker selected={cat} title={t('Icon for {name}', { name })} onPick={(id) => { setSkillCat(name, id); setCat(id); }} onClose={() => setPicking(false)} />}
    </>
  );
}
