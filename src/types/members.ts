export type Member = {
  id: string; // Firebase Auth UID
  name: string;
  color: string; // Tailwind color class or hex for chart
  email?: string;
};
