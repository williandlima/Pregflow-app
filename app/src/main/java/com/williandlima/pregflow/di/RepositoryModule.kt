package com.williandlima.pregflow.di

import com.williandlima.pregflow.data.repository.SermonRepository
import com.williandlima.pregflow.data.repository.SermonRepositoryImpl
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindSermonRepository(impl: SermonRepositoryImpl): SermonRepository
}
