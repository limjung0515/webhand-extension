/**
 * Naver Land (네이버 부동산) Scraper
 * 네이버 부동산 모바일 지도 페이지에서 매물 정보를 수집합니다.
 */

import type { NaverLandItem, ScrapeProgress } from '@/types/scraper';

export const NAVER_LAND_CONFIG = {
    id: 'naver-land-map',
    name: '네이버 부동산',
    url: 'https://m.land.naver.com',
    favicon: 'https://m.land.naver.com/favicon.ico',
    matcher: (url: string) => url.includes('m.land.naver.com/map')
};

class NaverLandScraper {
    private results: NaverLandItem[] = [];
    private seenIds = new Set<string>(); // 중복 제거용

    constructor() { }

    /**
     * 매물 목록 버튼 클릭하여 리스트 노출
     */
    async showListContainer(): Promise<boolean> {
        try {
            // 이미 리스트가 노출되어 있는지 확인
            const listContainer = document.getElementById('_listContainer');
            if (listContainer && listContainer.style.display !== 'none') {
                console.log('✅ 리스트가 이미 노출되어 있습니다');

                // 정렬 버튼 클릭하여 리스트 갱신
                // is-selected 클래스가 있는 버튼 찾기
                let sortButton = document.querySelector('.sort_filter .is-selected') as HTMLElement;

                // 없으면 첫 번째 정렬 버튼 (랭킹순)
                if (!sortButton) {
                    sortButton = document.querySelector('.sort_filter a') as HTMLElement;
                }

                if (sortButton) {
                    console.log('🔄 정렬 버튼 클릭하여 리스트 갱신');
                    sortButton.click();
                    await this.delay(500); // 갱신 대기
                }

                return true;
            }

            // 매물 목록 버튼 찾기
            const button = document.querySelector('._article') as HTMLElement;
            if (!button) {
                throw new Error('매물 목록 버튼을 찾을 수 없습니다');
            }

            // 버튼 클릭
            button.click();
            console.log('✅ 매물 목록 버튼 클릭');

            // 리스트 컨테이너가 노출될 때까지 대기
            await this.waitForElement('#_listContainer', 3000);
            return true;
        } catch (error) {
            console.error('❌ 리스트 노출 실패:', error);
            return false;
        }
    }

    /**
     * 전체 매물 수 추출 (버튼의 _count 요소에서)
     */
    getTotalCount(): number | null {
        try {
            const countElement = document.querySelector('._count') as HTMLElement;
            if (!countElement) return null;

            const text = countElement.textContent?.trim() || '';
            // "234+" 형식에서 숫자만 추출
            const match = text.match(/(\d+)\+?/);
            return match ? parseInt(match[1], 10) : null;
        } catch {
            return null;
        }
    }

    /**
     * 현재 화면에 보이는 매물 아이템 파싱
     */
    scrapeVisibleItems(): NaverLandItem[] {
        const items: NaverLandItem[] = [];
        // 실제 DOM 구조: data-id 속성 없음, .item 클래스 사용
        const itemElements = document.querySelectorAll('.item_area .item:not(.item--child)');

        console.log(`🔍 발견된 아이템 요소: ${itemElements.length}개`);

        let skippedNoLink = 0;
        let skippedDuplicate = 0;
        let skippedParseError = 0;

        itemElements.forEach((itemEl) => {
            const htmlItem = itemEl as HTMLElement;

            // ID 추출: 두 가지 방법
            // 1. 일반 매물: <a href="/article/info/2564871625">
            // 2. 동일 매물: <a href="javascript:void(0);" _articleno="2566372959">
            let itemId: string | null = null;

            // 방법 1: href에서 추출
            const linkEl = htmlItem.querySelector('a[href^="/article/info/"]') as HTMLAnchorElement;
            if (linkEl) {
                const match = linkEl.href.match(/\/article\/info\/(\d+)/);
                itemId = match ? match[1] : null;
            }

            // 방법 2: _articleno 속성에서 추출 (동일 매물)
            if (!itemId) {
                const articleNoEl = htmlItem.querySelector('[_articleno]') as HTMLElement;
                if (articleNoEl) {
                    itemId = articleNoEl.getAttribute('_articleno');
                }
            }

            // ID가 없으면 스킵
            if (!itemId) {
                skippedNoLink++;
                return;
            }

            // 중복 체크
            if (this.seenIds.has(itemId)) {
                skippedDuplicate++;
                return;
            }

            try {
                const item = this.extractItemData(htmlItem, itemId);
                if (item) {
                    items.push(item);
                    this.seenIds.add(itemId);
                } else {
                    skippedParseError++;
                    console.warn(`⚠️ 매물 데이터 null (ID: ${itemId})`);
                }
            } catch (error) {
                skippedParseError++;
                console.warn(`⚠️ 매물 파싱 실패 (ID: ${itemId}):`, error);
            }
        });

        console.log(`✅ 파싱 완료: ${items.length}개 수집 | 중복: ${skippedDuplicate}개 | 링크없음: ${skippedNoLink}개 | 오류: ${skippedParseError}개`);

        return items;
    }

    /**
     * 개별 매물 데이터 추출
     */
    private extractItemData(itemEl: HTMLElement, itemId: string): NaverLandItem | null {
        // 썸네일 이미지
        const thumbnail = itemEl.querySelector('.thumbnail') as HTMLElement;
        const thumbnailUrl = thumbnail?.style.backgroundImage
            ?.replace(/^url\(['"]?/, '')
            .replace(/['"]?\)$/, '') || '';

        // 아이콘 뱃지
        const badgeEl = itemEl.querySelector('.icon-badge');
        const badge = badgeEl?.textContent?.trim();

        // 매물 타입
        const titlePlaceEl = itemEl.querySelector('.title_place');
        const propertyType = titlePlaceEl?.textContent?.trim() || '';

        // 거래 유형
        const dealTypeEl = itemEl.querySelector('.price_area .type');
        const dealType = dealTypeEl?.textContent?.trim() || '';

        // 가격
        const priceEl = itemEl.querySelector('.price_area .price');
        const price = priceEl?.textContent?.trim() || '';

        // 면적, 층수, 방향 (첫 번째 spec에서 추출)
        const specEls = itemEl.querySelectorAll('.information_area .spec');
        const firstSpecText = specEls[0]?.textContent?.trim() || '';
        const { area, floor, direction } = this.parseSpec(firstSpecText);

        // 상세 설명 (두 번째 spec이 있으면 추가)
        const description = specEls.length > 1
            ? specEls[1]?.textContent?.trim() || ''
            : '';

        // 태그
        const tagEls = itemEl.querySelectorAll('.tag_area .tag');
        const tags = Array.from(tagEls).map(el => el.textContent?.trim() || '');

        // 중개사명 ("제공" 부분 제거)
        const agentNameEls = itemEl.querySelectorAll('.cp_area .agent_name');
        const agentName = Array.from(agentNameEls)
            .map(el => {
                const text = el.textContent?.trim() || '';
                // "공실클럽 제공 / 우리공인중개사 사무소" → "우리공인중개사 사무소"
                return text.split('/').map(part => part.trim()).filter(part => !part.includes('제공')).join(' / ');
            })
            .filter(Boolean)
            .join(' / ');

        // 확인매물 날짜
        const confirmedEl = itemEl.querySelector('.merit_area .type-confirmed');
        const confirmedDate = confirmedEl?.textContent?.trim().replace('확인매물 ', '');

        // 매물 상세 링크 (https://fin.land.naver.com/articles/{itemId})
        const articleUrl = `https://fin.land.naver.com/articles/${itemId}`;

        return {
            itemId,
            thumbnailUrl,
            badge,
            propertyType,
            dealType,
            price,
            area,
            floor,
            direction,
            description,
            tags,
            agentName,
            confirmedDate,
            articleUrl
        };
    }

    /**
     * spec 텍스트에서 면적, 층수, 방향 추출
     * 예: "39/29.9㎡, 4/5층, 남동향" → { area: "39/29.9㎡", floor: "4/5층", direction: "남동향" }
     */
    private parseSpec(specText: string): { area?: string; floor?: string; direction?: string } {
        const parts = specText.split(',').map(p => p.trim());

        let area: string | undefined;
        let floor: string | undefined;
        let direction: string | undefined;

        parts.forEach(part => {
            if (part.includes('㎡') || part.includes('m²')) {
                area = part;
            } else if (part.includes('층')) {
                floor = part;
            } else if (part.includes('향')) {
                direction = part;
            }
        });

        return { area, floor, direction };
    }

    /**
     * 리스트 컨테이너 내에서 무한스크롤
     * @returns 현재 스크롤 위치
     */
    async scrollToBottom(): Promise<number> {
        const listContainer = document.getElementById('_listContainer');
        if (!listContainer) {
            throw new Error('리스트 컨테이너를 찾을 수 없습니다');
        }

        console.log('🔍 리스트 컨테이너 발견:', listContainer);
        console.log('📏 scrollHeight:', listContainer.scrollHeight, 'clientHeight:', listContainer.clientHeight);

        // 실제 스크롤 가능한 요소 찾기 (내부에 있을 수 있음)
        let scrollableElement = listContainer;

        // overflow가 있는 자식 요소 찾기
        const children = listContainer.querySelectorAll('*');
        for (const child of Array.from(children)) {
            const el = child as HTMLElement;
            const style = window.getComputedStyle(el);
            if (style.overflowY === 'scroll' || style.overflowY === 'auto') {
                if (el.scrollHeight > el.clientHeight) {
                    scrollableElement = el;
                    console.log('✅ 실제 스크롤 가능한 요소 발견:', el);
                    break;
                }
            }
        }

        // 컨테이너 끝까지 스크롤
        const scrollTop = scrollableElement.scrollHeight;
        console.log(`⬇️ 스크롤 시도: ${scrollableElement.scrollTop} → ${scrollTop}`);

        scrollableElement.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
        });

        // 스크롤 완료 대기
        await this.delay(800);

        const finalPosition = scrollableElement.scrollTop;
        console.log(`📍 스크롤 후 위치: ${finalPosition}`);

        return finalPosition; // 최종 스크롤 위치 반환
    }

    /**
     * 새로운 아이템이 로드될 때까지 대기 (최대 timeout까지)
     */
    async waitForNewItems(previousCount: number, timeout: number = 3000): Promise<boolean> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const currentCount = this.seenIds.size;
            if (currentCount > previousCount) {
                return true; // 새 아이템 발견
            }
            await this.delay(300);
        }

        return false; // 타임아웃
    }

    /**
     * 전체 매물 스크래핑 (무한스크롤 포함)
     */
    async scrapeAll(
        onProgress: (progress: ScrapeProgress) => void,
        shouldStop?: () => boolean  // 중단 체크 콜백
    ): Promise<NaverLandItem[]> {
        try {
            // 1. 매물 목록 노출
            const listShown = await this.showListContainer();
            if (!listShown) {
                throw new Error('매물 목록을 노출할 수 없습니다');
            }

            // 2. 전체 매물 수 추출
            const totalCount = this.getTotalCount();
            console.log(`📊 전체 매물 수: ${totalCount ? totalCount + '+' : '알 수 없음'}`);

            onProgress({
                current: 0,
                total: totalCount || 0,
                status: 'scraping',
                message: '매물 수집 시작...'
            });

            // 3. 무한스크롤 + 파싱
            let noNewItemsCount = 0;
            const MAX_NO_NEW_ITEMS = 2; // 2번 연속 새 아이템 없으면 중단 (속도 개선)
            let lastScrollPosition = 0;

            while (true) {
                // 중단 체크
                if (shouldStop && shouldStop()) {
                    console.log('⏹️ 사용자에 의해 중단됨');
                    throw new Error('스크래핑이 사용자에 의해 중단되었습니다');
                }

                // 현재 보이는 아이템 파싱
                const previousCount = this.seenIds.size;
                const newItems = this.scrapeVisibleItems();
                this.results.push(...newItems);

                // 진행률 업데이트
                const currentCount = this.seenIds.size;
                onProgress({
                    current: currentCount,
                    total: totalCount || currentCount,
                    status: 'scraping',
                    message: totalCount
                        ? `${totalCount}개 중 ${currentCount}개 수집`
                        : `${currentCount}개 수집 중...`
                });

                console.log(`📦 현재까지 수집: ${currentCount}개`);

                // 완료 조건 1: 전체 매물 수와 동일
                if (totalCount && currentCount >= totalCount) {
                    console.log('✅ 전체 매물 수집 완료');
                    break;
                }

                // 스크롤 다운
                const currentScrollPosition = await this.scrollToBottom();

                // 완료 조건 2: 스크롤 위치가 변하지 않음 (끝에 도달)
                if (currentScrollPosition === lastScrollPosition) {
                    console.log('✅ 스크롤 끝에 도달함');
                    break;
                }
                lastScrollPosition = currentScrollPosition;

                // 새 아이템 로드 대기 (1.5초로 단축)
                const hasNewItems = await this.waitForNewItems(previousCount, 1500);

                if (!hasNewItems) {
                    noNewItemsCount++;
                    console.log(`⏳ 새 아이템 없음 (${noNewItemsCount}/${MAX_NO_NEW_ITEMS})`);

                    // 완료 조건 3: 연속으로 새 아이템 없음
                    if (noNewItemsCount >= MAX_NO_NEW_ITEMS) {
                        console.log('✅ 더 이상 새 매물이 없습니다');
                        break;
                    }
                } else {
                    noNewItemsCount = 0; // 리셋
                }
            }

            // 4. 완료
            onProgress({
                current: this.results.length,
                total: totalCount || this.results.length,
                status: 'complete',
                message: `총 ${this.results.length}개 매물 수집 완료`
            });

            console.log(`🎉 스크래핑 완료: ${this.results.length}개`);
            return this.results;

        } catch (error) {
            onProgress({
                current: 0,
                total: 0,
                status: 'error',
                message: error instanceof Error ? error.message : '알 수 없는 오류'
            });
            throw error;
        }
    }

    /**
     * 요소가 나타날 때까지 대기
     */
    private async waitForElement(selector: string, timeout: number = 5000): Promise<HTMLElement> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const element = document.querySelector(selector) as HTMLElement;
            if (element && element.style.display !== 'none') {
                return element;
            }
            await this.delay(100);
        }

        throw new Error(`요소를 찾을 수 없습니다: ${selector}`);
    }

    /**
     * 딜레이 유틸리티
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export { NaverLandScraper };
