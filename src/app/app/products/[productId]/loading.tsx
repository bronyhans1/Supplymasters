import { MasterRecordSkeleton } from "@/components/ui/TableSkeleton";

export default function ProductDetailLoading() {
  return <MasterRecordSkeleton fieldCount={5} showEditForm />;
}
