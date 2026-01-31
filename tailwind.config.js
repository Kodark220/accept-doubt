module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        'genlayer-purple': '#6f3bff',
        'genlayer-blue': '#0f88ff',
        'genlayer-dark': '#030511',
        'genlayer-accent': '#ffd166'
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
