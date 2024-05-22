export default async function Page({
  searchParams,
}: {
  searchParams?: { id?: string };
}) {
  const id = searchParams?.id;
  return (
    <div>
      Hello Dynamic route {id}
    </div>
  );
}
