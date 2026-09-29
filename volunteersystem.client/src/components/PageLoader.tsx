import Skeleton from './ui/Skeleton';

/* Пока грузится чанк страницы — показываем «скелет» в ритме реальной страницы:
   заголовок, подзаголовок, плитки метрик и одна большая панель. */
export default function PageLoader() {
    return (
        <div className="page-loader" role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">Загрузка страницы…</span>

            <div className="page-loader-head">
                <Skeleton width={260} height={30} radius={12} />
                <Skeleton width={180} height={14} radius={7} />
            </div>

            <div className="page-loader-stats">
                {[0, 1, 2, 3].map(i => (
                    <Skeleton key={i} height={104} radius={18} />
                ))}
            </div>

            <Skeleton height={320} radius={18} />
        </div>
    );
}
