import { C } from '../../../theme/tokens';

export const P = {
    ...C,
    gradient: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`,
    gradientSubtle: `linear-gradient(135deg, ${C.brandLight} 0%, #FFF 100%)`,
    gradientMuted: `linear-gradient(135deg, ${C.brandLight} 0%, #F8F5FA 100%)`
};

export type Option = { id: string; label: string };
