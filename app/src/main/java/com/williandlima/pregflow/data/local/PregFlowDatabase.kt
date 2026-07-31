package com.williandlima.pregflow.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

@Database(
    entities = [SermonEntity::class, BlockEntity::class],
    version = 1,
    exportSchema = false,
)
@TypeConverters(Converters::class)
abstract class PregFlowDatabase : RoomDatabase() {
    abstract fun sermonDao(): SermonDao
}
