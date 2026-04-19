document.addEventListener('DOMContentLoaded', () => {
    renderCartBadge();
    initTopCategory();
    fetchProducts();
    updateFilterStyles();

    // 키워드 라이브 검색 (디바운스 최적화 도입 - 메모리 절약)
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                filterState.keyword = e.target.value.trim();
                const activePage = document.querySelector('.page.active');
                if (activePage && activePage.id === 'page-community') {
                    // 커뮤니티 무한 스크롤 및 필터 연동 시 reset=true
                    fetchCommunityPosts && fetchCommunityPosts(true);
                } else {
                    fetchProducts(true);
                }
            }, 250); // 250ms 대기 후 렌더링 호출
        });
    }

    // 삭제된 글로벌 이벤트 바인딩 (이제 renderSubCategories안에서 각각 바인딩됨)

    // 드롭다운 토글 매니저
    document.querySelectorAll('.filter-dropdown').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = 'panel-' + btn.getAttribute('data-target');
            const isActive = btn.classList.contains('open');

            // 모두 초기화 (접기)
            document.querySelectorAll('.filter-dropdown').forEach(b => b.classList.remove('open'));
            document.querySelectorAll('.filter-panel').forEach(p => p.classList.remove('show'));
            
            // 토글 로직
            if (!isActive) {
                btn.classList.add('open');
                document.getElementById(targetId).classList.add('show');
                document.querySelector('.filter-panels').classList.add('show');
            } else {
                document.querySelector('.filter-panels').classList.remove('show');
            }
        });
    });

    // 초기화 버튼
    const resetBtn = document.querySelector('.filter-reset');
    if(resetBtn) resetBtn.addEventListener('click', resetFilters);

    // 이벤트 리스너 등록 시 사용할 tradeChips (Registration Form 용)
    const formTradeChips = document.querySelectorAll('#page-register .trade-chip');
    
    // 거래 방식 칩 로직
    formTradeChips.forEach(chip => {
        chip.addEventListener('click', () => {
            formTradeChips.forEach(c => c.classList.remove('on'));
            chip.classList.add('on');
            
            const isAuction = chip.textContent.trim() === '경매';
            document.getElementById('auction-date-row').style.display = isAuction ? 'block' : 'none';
            document.getElementById('price-label').innerHTML = isAuction ? '경매 시작가<span>*</span>' : '판매 희망가<span>*</span>';
        });
    });

    // 매물 상태 칩
    const condChips = document.querySelectorAll('#page-register .cond-chip');
    condChips.forEach(chip => {
        chip.addEventListener('click', () => {
            condChips.forEach(c => c.classList.remove('on'));
            chip.classList.add('on');
        });
    });
    
    // 서브 칩 상호작용 (필터)
    document.querySelectorAll('.f-sub-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const key = chip.getAttribute('data-key');
            const val = chip.getAttribute('data-val');
            applySubFilter(key, val);
        });
    });
    
    // 가격 범위 지정(Price Filter) 적용
    const priceApplyBtn = document.getElementById('price-apply');
    if(priceApplyBtn) {
        priceApplyBtn.addEventListener('click', () => {
            const minVal = document.getElementById('min-price').value;
            const maxVal = document.getElementById('max-price').value;
            filterState.minPrice = minVal ? parseInt(minVal, 10) : null;
            filterState.maxPrice = maxVal ? parseInt(maxVal, 10) : null;
            updateFilterStyles();
            fetchProducts(true);
            
            // 시각적 피드백
            priceApplyBtn.textContent = '적용됨✓';
            priceApplyBtn.style.background = '#1E8E3E';
            setTimeout(() => {
                priceApplyBtn.textContent = '범위 적용';
                priceApplyBtn.style.background = 'var(--blue-800)';
            }, 1000);
        });
    }
    
    // 매물 사진 업로드 (Base64 변환 & WebP 리사이징)
    const photoInput = document.getElementById('photo-upload-input');
    if(photoInput) {
        photoInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if(!file) return;
            
            try {
                // utils.js의 스마트 리사이징 모듈 활용 (1080px WebP 압축)
                const result = await resizeAndCompressImage(file, { maxWidth: 1080, quality: 0.85 });
                uploadedBase64 = result.base64;
                uploadedBlob = result.blob;
                
                const mainBox = document.getElementById('photo-box-main');
                mainBox.style.backgroundImage = `url(${uploadedBase64})`;
                
                // ✅ 업로드한 사진 우상단에 ✕ 삭제 버튼 추가
                mainBox.innerHTML = '<button type="button" id="photo-delete-btn" title="사진 삭제" style="position:absolute; top:6px; right:6px; width:24px; height:24px; border-radius:50%; background:rgba(0,0,0,0.6); color:#fff; border:none; font-size:14px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; padding:0; box-shadow:0 2px 4px rgba(0,0,0,0.2); z-index:10;">✕</button>';
                
                if (getComputedStyle(mainBox).position === 'static') {
                    mainBox.style.position = 'relative';
                }
                
                // 삭제 버튼 핸들러
                const delBtn = document.getElementById('photo-delete-btn');
                if (delBtn) {
                    delBtn.addEventListener('click', function(ev) {
                        ev.stopPropagation();
                        ev.preventDefault();
                        uploadedBase64 = null;
                        uploadedBlob = null;
                        if (photoInput) photoInput.value = '';
                        mainBox.style.backgroundImage = 'none';
                        mainBox.innerHTML = '<span class="photo-plus">+</span><span class="photo-main-label">대표사진</span>';
                    });
                }
            } catch (err) {
                console.error('이미지 압축 실패:', err);
                alert('이미지 처리 중 오류가 발생했습니다. (' + err.message + ')');
            }
        });
    }

    // 매물 등록 버튼 리스너
    const submitBtn = document.querySelector('#page-register .submit-btn');
    if(submitBtn) {
        submitBtn.addEventListener('click', registerProduct);
    }
});
