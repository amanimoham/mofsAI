# mofsAI

## Overview
mofsAI is a digital agency landing page built with Next.js 14, TypeScript, and TailwindCSS. This project showcases the services, projects, and capabilities of the agency, providing a modern and responsive user experience.

## Project Structure
```
mofsAI
├── src
│   ├── app
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   ├── Services.tsx
│   │   ├── Portfolio.tsx
│   │   ├── Testimonials.tsx
│   │   ├── CTA.tsx
│   │   ├── Footer.tsx
│   │   └── common
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       └── Container.tsx
│   ├── lib
│   │   └── utils.ts
│   ├── types
│   │   └── index.ts
│   └── styles
│       └── globals.css
├── public
│   └── assets
├── .env.local
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
└── README.md
```

## Setup Instructions
1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd mofsAI
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:3000` to view the application.

## Features
- **Responsive Design**: The landing page is fully responsive and adapts to various screen sizes.
- **Reusable Components**: Utilizes reusable components for buttons, cards, and layout containers.
- **TailwindCSS**: Leverages TailwindCSS for styling, ensuring a modern and clean design.
- **TypeScript**: Provides type safety and better development experience.

## Components
- **Header**: Navigation bar with links to different sections.
- **Hero**: Main introduction section with a call-to-action.
- **Services**: Displays the services offered by the agency.
- **Portfolio**: Showcases projects with hover effects.
- **Testimonials**: Displays client feedback.
- **CTA**: Call-to-action section encouraging user engagement.
- **Footer**: Contains copyright and additional links.

## Contributing
Feel free to submit issues or pull requests for improvements or bug fixes. 

## License
This project is licensed under the MIT License.