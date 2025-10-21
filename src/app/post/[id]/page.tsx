// src/app/post/[id]/page.tsx

import { Metadata } from 'next';
import PostClient from './PostClient';
import { createServerSupabaseClient } from '@/lib/server-supabase';
import { extractDescription, getFirstImage, generatePageTitle } from '@/lib/metadata-utils';

interface PostPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Generar metadata dinámica para SEO
export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const supabase = await createServerSupabaseClient();
  
  // Obtener datos del post desde Supabase
  const { data: post } = await supabase
    .from('posts')
    .select('title, content, images, author_id')
    .eq('id', resolvedParams.id)
    .single();

  // Si no hay post, retornar metadata por defecto
  if (!post) {
    return {
      title: 'Post no encontrado - EsteticaProHub',
      description: 'El post que buscas no existe o ha sido eliminado.',
    };
  }

  // Extraer metadata del post
  const pageTitle = generatePageTitle(post.title);
  const description = extractDescription(post.content, 160);
  const firstImage = getFirstImage(post.images);
  const postUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://esteticaprohub.com'}/post/${resolvedParams.id}`;

  return {
    title: pageTitle,
    description: description,
    openGraph: {
      title: post.title,
      description: description,
      url: postUrl,
      siteName: 'EsteticaProHub',
      images: firstImage ? [
        {
          url: firstImage,
          alt: post.title,
        }
      ] : [],
      locale: 'es_ES',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: description,
      images: firstImage ? [firstImage] : [],
    },
    alternates: {
      canonical: postUrl,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const resolvedParams = await params;
  
  return <PostClient postId={resolvedParams.id} />;
}