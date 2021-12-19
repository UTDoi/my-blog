module.exports = {
  purge: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: false,
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "2rem",
        lg: "4rem",
        xl: "5rem",
      },
      screens: {
        DEFAULT: "100%",
        sm: "640px",
        md: "768px",
        lg: "960px",
        xl: "960px",
      },
    },
    extend: {
      fontFamily: {
        roboto: ["Roboto", "Noto Sans JP", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
