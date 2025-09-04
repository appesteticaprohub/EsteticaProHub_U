interface PostPageProps {
  params: {
    id: string;
  };
}

export default function PostPage({ params }: PostPageProps) {
  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-4">Post ID: {params.id}</h1>
    </main>
  );
}