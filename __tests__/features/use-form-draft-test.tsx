import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { useState } from 'react';
import { Text, TextInput } from 'react-native';
import { useFormDraft } from '@/features/shared/use-form-draft';
import { drafts } from '@/infrastructure/storage/drafts';

function Editor({ draftKeyValue }: { draftKeyValue: string | null }) {
  const [text, setText] = useState('');
  const d = useFormDraft({ key: draftKeyValue, value: text, isEmpty: (v) => v === '', onRestore: setText });
  return (
    <>
      <TextInput testID="input" value={text} onChangeText={setText} />
      <Text testID="state">{`${d.hydrated ? 'hydrated' : 'loading'}|${d.restored ? 'restored' : ''}`}</Text>
    </>
  );
}

const flush = () => act(async () => {});

describe('useFormDraft', () => {
  it('does not wipe a stored draft on the empty first render, then restores it', async () => {
    await drafts.save('k1', 'kayıtlı taslak');
    await render(<Editor draftKeyValue="k1" />);
    await flush();
    expect(screen.getByTestId('input').props.value).toBe('kayıtlı taslak');
    expect(screen.getByTestId('state').props.children).toBe('hydrated|restored');
    expect(await drafts.load('k1')).toBe('kayıtlı taslak');
  });

  it('never overwrites text typed before restoration finished', async () => {
    await drafts.save('k2', 'eski');
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const realLoad = drafts.load.bind(drafts);
    jest.spyOn(drafts, 'load').mockImplementationOnce(async (key) => {
      await gate;
      return realLoad(key);
    });
    await render(<Editor draftKeyValue="k2" />);
    await fireEvent.changeText(screen.getByTestId('input'), 'yeni yazı');
    release();
    await flush();
    expect(screen.getByTestId('input').props.value).toBe('yeni yazı');
    expect(screen.getByTestId('state').props.children).toBe('hydrated|');
    await flush();
    expect(await drafts.load('k2')).toBe('yeni yazı');
  });

  it('saves after hydration and removes the draft when the form is emptied', async () => {
    await render(<Editor draftKeyValue="k3" />);
    await flush();
    await fireEvent.changeText(screen.getByTestId('input'), 'merhaba');
    await flush();
    expect(await drafts.load('k3')).toBe('merhaba');
    await fireEvent.changeText(screen.getByTestId('input'), '');
    await flush();
    expect(await drafts.load('k3')).toBeNull();
  });

  it('stores nothing when drafts are disabled', async () => {
    const save = jest.spyOn(drafts, 'save');
    await render(<Editor draftKeyValue={null} />);
    await fireEvent.changeText(screen.getByTestId('input'), 'x');
    await flush();
    expect(save).not.toHaveBeenCalled();
  });
});

afterEach(() => jest.restoreAllMocks());
