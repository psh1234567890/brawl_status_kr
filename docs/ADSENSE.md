# AdSense 운영 준비

이 저장소는 AdSense 환경 변수가 없으면 광고 코드와 광고 슬롯을 렌더링하지 않는다. 실제 AdSense 계정이 준비되기 전에는 임의의 publisher ID나 slot ID를 넣지 않는다.

## 환경 변수

- `NEXT_PUBLIC_ADSENSE_CLIENT_ID`: `ca-pub-`로 시작하는 AdSense client ID
- `NEXT_PUBLIC_ADSENSE_SLOT_ID`: 실제 반응형 광고 단위의 slot ID

두 값이 모두 있을 때만 화면 광고 슬롯이 렌더링된다. client ID만 있어도 사이트 연결용 AdSense 스크립트와 `/ads.txt` 응답은 준비할 수 있다.

## ads.txt

`/ads.txt`는 `NEXT_PUBLIC_ADSENSE_CLIENT_ID`가 `ca-pub-` + 16자리 숫자 형식일 때만 다음 형식의 한 줄을 자동 생성한다.

```text
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

AdSense가 설정되지 않았거나 형식이 잘못되면 `/ads.txt`는 404를 반환해 가짜 publisher 정보를 공개하지 않는다. 실제 배포 후 브라우저에서 `https://www.brawl-o1.site/ads.txt`를 직접 열어 계정의 publisher ID와 일치하는지 확인한다.

## 광고 단위 초기화

반응형 광고 단위는 `<ins class="adsbygoogle">` 렌더링 뒤 Google 공식 비동기 예시와 같이 `(adsbygoogle = window.adsbygoogle || []).push({})`를 호출한다. client/slot 환경 변수가 없으면 빈 광고 영역도 렌더링하지 않는다.

## 동의와 개인정보

EEA, 영국, 스위스 사용자에게 Google 광고를 제공하기 전에는 AdSense의 Privacy & messaging 또는 다른 Google 인증 CMP를 실제 계정 설정과 함께 구성해야 한다. 저장소의 개인정보처리방침은 광고·쿠키 가능성을 고지하지만, CMP 활성화 여부와 실제 광고 설정이 바뀌면 문구도 함께 재검토한다.

Google CMP를 활성화할 때는 현재 CSP가 CMP가 사용하는 실제 Google 도메인을 허용하는지 production 브라우저에서 확인한다. 확인되지 않은 도메인을 미리 CSP에 추가하지 않는다.

## 팬 콘텐츠 정책

Supercell 팬 콘텐츠 정책은 광고를 통한 팬 콘텐츠 수익화를 허용하지만, 광고가 관련 법률·플랫폼 정책·팬 콘텐츠 정책을 준수해야 한다. 사이트의 비공식 팬 콘텐츠 고지와 Fan Content Policy 링크는 계속 유지한다.
