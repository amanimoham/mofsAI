// This file exports TypeScript interfaces and types used throughout the application, ensuring type safety.

export interface Service {
    id: number;
    title: string;
    description: string;
    icon: string; // URL or path to the icon
}

export interface Project {
    id: number;
    title: string;
    description: string;
    image: string; // URL or path to the project image
}

export interface Testimonial {
    id: number;
    name: string;
    position: string;
    company: string;
    message: string;
}

export interface ContactForm {
    name: string;
    email: string;
    message: string;
}