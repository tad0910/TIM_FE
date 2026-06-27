import InfiniteScrollPostList from "../../dashboard/components/InfiniteScrollPostList";

interface PostsSectionProps {
  userId: string;
  refreshTrigger?: number;
}

export default function PostsSection({ userId, refreshTrigger }: PostsSectionProps) {
  return (
    <div className="space-y-6">
      <InfiniteScrollPostList 
        userId={userId}
        showUserPostsOnly={true}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}
