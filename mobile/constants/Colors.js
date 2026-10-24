import { palette } from "./designSystem";

export const Colors = {
  primary: palette.primary,
  warning: palette.danger,

  dark: {
    text: "#D7E0D9",
    title: "#FFFFFF",
    background: "#18201B",
    navBackground: "#111713",
    iconColour: "#A9B5AC",
    iconColourFocused: "#FFFFFF",
    uiBackground: "#222C25",
    border: "#354239",
    placeholder: "#8F9B92",
  },
  light: {
    text: palette.text,
    title: palette.ink,
    background: palette.background,
    navBackground: palette.surface,
    iconColour: palette.muted,
    iconColourFocused: palette.primaryStrong,
    uiBackground: palette.surface,
    border: palette.border,
    placeholder: palette.subtle,
  },
};
