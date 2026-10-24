export const palette = {
  primary: "#35A853",
  primaryStrong: "#227B3E",
  primaryDark: "#175D31",
  primarySoft: "#EAF7EE",
  primaryTint: "#F4FBF6",
  background: "#F3F7F4",
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAF8",
  ink: "#17201A",
  text: "#4F5E54",
  muted: "#748079",
  subtle: "#96A199",
  border: "#DCE6DF",
  borderStrong: "#C9D8CE",
  danger: "#C64545",
  dangerSoft: "#FFF0F0",
  warning: "#B87618",
  warningSoft: "#FFF7E8",
  info: "#3679B7",
  infoSoft: "#EFF7FF",
  overlay: "rgba(23, 32, 26, 0.46)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
};

export const typography = {
  display: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  section: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: -0.25,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
  },
  bodyStrong: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
  },
  caption: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
};

export const shadows = {
  soft: {
    shadowColor: "#183125",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  card: {
    shadowColor: "#183125",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  floating: {
    shadowColor: "#175D31",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 7,
  },
};

export const commonStyles = {
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.soft,
  },
  input: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: palette.surface,
    color: palette.ink,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    ...shadows.soft,
  },
};
