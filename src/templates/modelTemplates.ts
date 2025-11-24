// Model Templates for Quick Start

import type { ModelInput } from '../types/builder';

export interface ModelTemplate {
  id: string;
  name: string;
  description: string;
  model: ModelInput;
}

export const modelTemplates: ModelTemplate[] = [
  {
    id: 'blog-post',
    name: 'Blog Post',
    description: 'A complete blog post model with title, content, author, and metadata fields',
    model: {
      name: 'BlogPost',
      kind: 'component',
      fields: [
        {
          name: 'title',
          type: 'string',
          required: true,
          helperText: 'The title of the blog post',
        },
        {
          name: 'slug',
          type: 'string',
          required: true,
          helperText: 'URL-friendly version of the title',
        },
        {
          name: 'excerpt',
          type: 'text',
          helperText: 'Short summary of the post',
        },
        {
          name: 'content',
          type: 'richText',
          required: true,
          helperText: 'Main content of the blog post',
        },
        {
          name: 'author',
          type: 'reference',
          model: 'Author',
          helperText: 'Reference to the author',
        },
        {
          name: 'publishedAt',
          type: 'date',
          helperText: 'Publication date',
        },
        {
          name: 'tags',
          type: 'list',
          subType: 'string',
          helperText: 'List of tags for categorization',
        },
      ],
    },
  },
  {
    id: 'product',
    name: 'Product',
    description: 'E-commerce product model with pricing, inventory, and media fields',
    model: {
      name: 'Product',
      kind: 'data',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          helperText: 'Product name',
        },
        {
          name: 'sku',
          type: 'string',
          required: true,
          helperText: 'Stock keeping unit',
        },
        {
          name: 'price',
          type: 'number',
          required: true,
          helperText: 'Product price',
        },
        {
          name: 'description',
          type: 'text',
          helperText: 'Product description',
        },
        {
          name: 'images',
          type: 'list',
          subType: 'file',
          helperText: 'Product images',
        },
        {
          name: 'inStock',
          type: 'boolean',
          defaultValue: true,
          helperText: 'Inventory status',
        },
        {
          name: 'category',
          type: 'string',
          helperText: 'Product category',
        },
      ],
    },
  },
  {
    id: 'landing-page',
    name: 'Landing Page',
    description: 'Marketing landing page with hero section, CTA, and modular sections',
    model: {
      name: 'LandingPage',
      kind: 'page',
      fields: [
        {
          name: 'title',
          type: 'string',
          required: true,
          helperText: 'Page title for SEO',
        },
        {
          name: 'url',
          type: 'url',
          required: true,
          helperText: 'Page URL path',
        },
        {
          name: 'heroTitle',
          type: 'string',
          helperText: 'Main heading in hero section',
        },
        {
          name: 'heroSubtitle',
          type: 'text',
          helperText: 'Supporting text in hero section',
        },
        {
          name: 'ctaButton',
          type: 'object',
          subFields: [
            { name: 'text', type: 'string' },
            { name: 'url', type: 'url' },
          ],
          helperText: 'Call to action button',
        },
        {
          name: 'sections',
          type: 'list',
          subType: 'reference',
          model: 'Section',
          helperText: 'Page sections',
        },
      ],
    },
  },
  {
    id: 'faq-item',
    name: 'FAQ Item',
    description: 'Simple question and answer pair for FAQ sections',
    model: {
      name: 'FAQItem',
      kind: 'component',
      fields: [
        {
          name: 'question',
          type: 'string',
          required: true,
          helperText: 'The question',
        },
        {
          name: 'answer',
          type: 'text',
          required: true,
          helperText: 'The answer',
        },
        {
          name: 'category',
          type: 'string',
          helperText: 'FAQ category',
        },
        {
          name: 'order',
          type: 'number',
          helperText: 'Display order',
        },
      ],
    },
  },
  {
    id: 'team-member',
    name: 'Team Member',
    description: 'Team member profile with photo, bio, and social links',
    model: {
      name: 'TeamMember',
      kind: 'data',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          helperText: 'Full name',
        },
        {
          name: 'role',
          type: 'string',
          required: true,
          helperText: 'Job title or role',
        },
        {
          name: 'photo',
          type: 'file',
          helperText: 'Profile photo',
        },
        {
          name: 'bio',
          type: 'text',
          helperText: 'Short biography',
        },
        {
          name: 'email',
          type: 'email',
          helperText: 'Email address',
        },
        {
          name: 'linkedIn',
          type: 'url',
          helperText: 'LinkedIn profile URL',
        },
        {
          name: 'twitter',
          type: 'url',
          helperText: 'Twitter profile URL',
        },
      ],
    },
  },
  {
    id: 'testimonial',
    name: 'Testimonial',
    description: 'Customer testimonial with rating and customer information',
    model: {
      name: 'Testimonial',
      kind: 'component',
      fields: [
        {
          name: 'customerName',
          type: 'string',
          required: true,
          helperText: 'Name of the customer',
        },
        {
          name: 'customerRole',
          type: 'string',
          helperText: 'Customer job title or role',
        },
        {
          name: 'customerCompany',
          type: 'string',
          helperText: 'Customer company name',
        },
        {
          name: 'customerPhoto',
          type: 'file',
          helperText: 'Customer photo',
        },
        {
          name: 'testimonial',
          type: 'text',
          required: true,
          helperText: 'The testimonial text',
        },
        {
          name: 'rating',
          type: 'number',
          helperText: 'Rating out of 5',
        },
        {
          name: 'featured',
          type: 'boolean',
          defaultValue: false,
          helperText: 'Show on homepage',
        },
      ],
    },
  },
];
