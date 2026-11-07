import { PageLoading } from "@/components/PageLoading";

/** Shown from the click until this page's data comes back. */
export default function Loading() {
  return <PageLoading cards={1} />;
}
