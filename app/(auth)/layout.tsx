import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <div className="mb-8">
        <Image src="/logo-lumix.png" alt="Lumix" width={220} height={72} priority />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
