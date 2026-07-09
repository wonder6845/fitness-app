import { registerRootComponent } from 'expo';
import React, { useEffect, useState } from 'react';
import { db } from './src/storage/db';
import { applyTheme, ThemeName } from './src/theme';

// 저장된 테마를 먼저 적용한 뒤 앱 모듈을 로드한다.
// (각 화면의 StyleSheet가 "모듈 평가 시점"의 색을 캡처하기 때문에,
//  App을 정적으로 import하면 테마가 기본값으로 굳는다.)
function Boot() {
  const [App, setApp] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    (async () => {
      const saved = (await db.loadTheme()) as ThemeName;
      applyTheme(saved);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('./App').default as React.ComponentType;
      setApp(() => mod);
    })();
  }, []);

  return App ? React.createElement(App) : null;
}

registerRootComponent(Boot);
