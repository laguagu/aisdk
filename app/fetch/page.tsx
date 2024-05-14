const fetchData = async () => {
  "use server";
  const post = await fetch("https://jsonplaceholder.typicode.com/users");
  const result = await post.json();
  return result;
};

export default async function Page() {
  const data = await fetchData(); // Call the fetchData function and assign the returned data to the 'customers' variable
  const customers = Array.isArray(data) ? data : [data];

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold">Fetch</h1>
      <p className="text-lg">Fetch data from the server.</p>
      <div className="flex flex-col gap-4 mt-4">
        {customers.map((customer: any) => (
          <div key={customer.id} className="p-4 bg-zinc-100 rounded shadow-md">
            <h2 className="text-xl font-semibold">{customer.name}</h2>
            <p className="text-gray-700">{customer.address.zipcode}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
