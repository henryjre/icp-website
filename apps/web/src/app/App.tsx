import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "./components/Toast";

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}


