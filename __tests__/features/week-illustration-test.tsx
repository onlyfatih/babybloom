import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated } from 'react-native';
import { WeekIllustration } from '@/features/pregnancy/WeekIllustration';

jest.mock('expo-router', () => {
  const { useEffect: mockUseEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    // Treat the screen as focused for the lifetime of the test render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useFocusEffect: (cb: () => void | (() => void)) => mockUseEffect(cb, []),
  };
});

afterEach(() => jest.restoreAllMocks());

describe('WeekIllustration', () => {
  it('animates when motion is allowed', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const loop = jest.spyOn(Animated, 'loop');
    await render(<WeekIllustration illustrationId="plum" size={200} />);
    await act(async () => {});
    expect(loop).toHaveBeenCalled();
    expect(screen.getByLabelText(/erik/)).toBeTruthy();
  });
  it('stays still when the system asks for reduced motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const loop = jest.spyOn(Animated, 'loop');
    await render(<WeekIllustration illustrationId="plum" size={200} />);
    await act(async () => {});
    expect(loop).not.toHaveBeenCalled();
  });
  it('stays still when animate is false', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const loop = jest.spyOn(Animated, 'loop');
    await render(<WeekIllustration illustrationId="banana" size={200} animate={false} />);
    await act(async () => {});
    expect(loop).not.toHaveBeenCalled();
  });
  it('says so when the image fails to load and does not substitute other art', async () => {
    await render(<WeekIllustration illustrationId="pumpkin" size={200} />);
    await fireEvent(screen.getByLabelText(/balkabağı/), 'error');
    expect(screen.getByText('Bu haftanın görseli yüklenemedi.')).toBeTruthy();
    expect(screen.queryByLabelText(/balkabağı/)).toBeNull();
  });
  it('shows the missing state for an unknown or absent illustration', async () => {
    await render(<WeekIllustration illustrationId={null} size={200} />);
    expect(screen.getByText('Bu haftanın görseli yüklenemedi.')).toBeTruthy();
  });
});
