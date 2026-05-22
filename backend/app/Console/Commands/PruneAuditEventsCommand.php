<?php

namespace App\Console\Commands;

use App\Models\AuditEvent;
use Illuminate\Console\Command;

/**
 * FR-014：稽核紀錄至少保留 30 天，超過可清除。
 * 預設 30 天，可用 --days=N 覆寫（測試時方便）。
 */
class PruneAuditEventsCommand extends Command
{
    protected $signature = 'members:prune-audit-events {--days=30}';

    protected $description = '刪除超過保留期限的 AuditEvent（預設 30 天）';

    public function handle(): int
    {
        $days = max(1, (int) $this->option('days'));
        $cutoff = now()->subDays($days);

        $deleted = AuditEvent::where('created_at', '<', $cutoff)->delete();

        $this->info("Pruned {$deleted} audit events older than {$days} days (before {$cutoff->toIso8601String()})");

        return self::SUCCESS;
    }
}
