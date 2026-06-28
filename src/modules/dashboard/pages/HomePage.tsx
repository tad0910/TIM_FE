import PostBox from "../components/PostBox";
import InfiniteScrollPostList from "../components/InfiniteScrollPostList";
import RankingCard from "../components/RankingCard";
import NewsList from "../components/NewsList";
import RewardPointsCard from "../components/RewardPointsCard";
import { useState } from "react";

export default function HomePage() {
  const [refreshPosts, setRefreshPosts] = useState(0);

  return (
    <div className="flex w-full">
      {/* Spacer Left - ensures equal distance from Left Sidebar */}
      <div className="hidden xl:block flex-1"></div>

      {/* Center Feed */}
      <div className="w-full max-w-[760px] space-y-4 flex-shrink-0">
        <PostBox onPostCreated={() => setRefreshPosts(prev => prev + 1)} />
        <InfiniteScrollPostList refreshTrigger={refreshPosts} />
      </div>

      {/* Spacer Right - ensures equal distance to Right Sidebar */}
      <div className="hidden xl:block flex-1"></div>

      {/* Right Sidebar */}
      <div className="hidden xl:block w-[320px] flex-shrink-0 sticky top-16 h-[calc(100vh-4rem)] pt-6">
        <aside className="space-y-4 h-full overflow-y-auto custom-scrollbar pb-10">
          <RewardPointsCard />
          <RankingCard />
          <NewsList />
        </aside>
      </div>
    </div>
  );
}