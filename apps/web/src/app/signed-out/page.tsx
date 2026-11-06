export default async function SignedOutPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main>
      <p>{error ? 'La connexion a échoué. Réessaie.' : 'Tu es déconnecté.'}</p>
      <a href="api/auth/login">Se connecter</a>
    </main>
  );
}
