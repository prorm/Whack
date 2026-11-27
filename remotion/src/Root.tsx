import React from "react";
import { Composition } from "remotion";
import { CapableX, CAPX_TOTAL } from "./capx/CapableX";

export const RemotionRoot: React.FC = () => {
  return <Composition id="CapableX" component={CapableX} durationInFrames={CAPX_TOTAL} fps={30} width={1920} height={1080} />;
};
