package com.williandlima.pregflow.di

import android.content.Context
import androidx.room.Room
import com.williandlima.pregflow.data.local.PregFlowDatabase
import com.williandlima.pregflow.data.local.SermonDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): PregFlowDatabase =
        Room.databaseBuilder(context, PregFlowDatabase::class.java, "pregflow.db").build()

    @Provides
    fun provideSermonDao(database: PregFlowDatabase): SermonDao = database.sermonDao()
}
